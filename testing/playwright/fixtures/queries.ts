import { recase } from "@kristiandupont/recase";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import type { DehydratedState } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import { diff as objectDiff } from "deep-object-diff";

import type { TRPCMutationKey, TRPCQueryInput, TRPCQueryKey } from "app/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

import type { ApiManager, ApiMixin, TRPCKey } from "./api";
import { createMixin } from "./utils";

const DEFAULT_AWAIT_CACHE_TIMEOUT = 5000;

type SnapshotNames = {
	queriesIndex?: number;
	cacheIndex?: number;
};

const getSnapshotNames = (testInfo: TestInfo): SnapshotNames => {
	const testInfoExtended = testInfo as TestInfo & {
		queriesSnapshotNames: SnapshotNames;
	};
	testInfoExtended.queriesSnapshotNames ??= {};
	return testInfoExtended.queriesSnapshotNames as SnapshotNames;
};

const getSnapshotName = (
	testInfo: TestInfo,
	indexKey: keyof SnapshotNames,
	overrideName: string | undefined,
	extension: string,
) => {
	const snapshotsNames = getSnapshotNames(testInfo);
	snapshotsNames[indexKey] ??= 0;
	const path = testInfo.titlePath.slice(1, -1).map((element) =>
		element
			.replace(/[^a-zA-Z0-9]/g, "-")
			// Trim dashes
			.replace(/(^-*|-*$)/g, "")
			// Replace multiple dashes with one
			.replaceAll(/-{2,}/g, "-")
			.toLowerCase(),
	);
	const name = [
		recase("mixed", "dash")(testInfo.title.replace(/[^a-zA-Z0-9]/g, "-")),
		indexKey.replace("Index", ""),
		// Removing baseName "0" by .filter(Boolean) is intended
		overrideName || snapshotsNames[indexKey],
		extension,
	]
		.filter(Boolean)
		.join(".");
	snapshotsNames[indexKey]! += 1;
	return [...path, name];
};

type KeysLists = {
	whitelistKeys: TRPCKey[];
	blacklistKeys: TRPCKey[];
};

const shouldIgnoreKey = (key: TRPCKey, keysLists: KeysLists) =>
	keysLists.blacklistKeys.includes(key) &&
	!keysLists.whitelistKeys.includes(key);

const getQueryCacheFromPage = (page: Page, timeout: number) =>
	page.evaluate(
		([timeoutInner]) => {
			if (!window.getDehydratedCache) {
				return { mutations: [], queries: [] };
			}
			return window.getDehydratedCache(timeoutInner);
		},
		[timeout] as const,
	);

const flattenError = (error: unknown) => {
	if (typeof error === "object" && error && "shape" in error) {
		const trpcError = error as TRPCClientErrorLike<AppRouter>;
		return {
			type: "TRPCError",
			message: trpcError.message,
		};
	}
	if (typeof error === "string") {
		const clientErrorMatch = error.match(/TRPCClientError: (.*)\n/);
		if (clientErrorMatch) {
			return {
				type: "TRPCClientError",
				message: clientErrorMatch[1],
			};
		}
	}
	return error;
};

const mapQueries = (queries: DehydratedState["queries"]) =>
	queries
		.sort((a, b) => a.queryHash.localeCompare(b.queryHash))
		.map(({ queryHash, queryKey, ...query }) => ({
			...query,
			queryKey: {
				handler: (queryKey[0] as string[]).join(".") as TRPCKey,
				input: JSON.stringify(
					(
						queryKey[1] as
							| {
									input: TRPCQueryInput<TRPCQueryKey>;
									type: "query" | "infinite";
							  }
							| undefined
					)?.input,
				),
			},
			state: {
				...query.state,
				error: flattenError(query.state.error),
				fetchFailureReason: undefined,
				// Removing actual dates as they are not stable for snapshots
				dataUpdatedAt: undefined,
				// Count can't go down, so we're diffing undefined -> some value
				dataUpdateCount:
					query.state.dataUpdateCount === 0
						? undefined
						: query.state.dataUpdateCount,
				errorUpdatedAt: undefined,
				errorUpdateCount:
					query.state.errorUpdateCount === 0
						? undefined
						: query.state.errorUpdateCount,
				fetchFailureCount:
					query.state.fetchFailureCount === 0
						? undefined
						: query.state.fetchFailureCount,
			},
		}));

const mapMutations = (mutations: DehydratedState["mutations"]) =>
	mutations.map((mutation) => ({
		...mutation,
		mutationKey: {
			handler: (mutation.mutationKey as [string[]])[0].join(".") as TRPCKey,
		},
		state: {
			...mutation.state,
			context: undefined,
			error: flattenError(mutation.state.error),
			failureReason: undefined,
			// Removing actual dates as they are not stable for snapshots
			submittedAt: undefined,
			// Count can't go down, so we're diffing undefined -> some value
			failureCount:
				mutation.state.failureCount === 0
					? undefined
					: mutation.state.failureCount,
		},
	}));

const getQueryCache = async (
	page: Page,
	keysLists: KeysLists,
	timeout: number,
) => {
	const cache = await getQueryCacheFromPage(page, timeout);
	const redactedQueries = mapQueries(cache.queries).filter(
		(query) => !shouldIgnoreKey(query.queryKey.handler, keysLists),
	);
	const redactedMutations = mapMutations(cache.mutations).filter(
		(mutation) => !shouldIgnoreKey(mutation.mutationKey.handler, keysLists),
	);
	return {
		queries: redactedQueries.reduce<
			Record<string, Omit<(typeof redactedQueries)[number], "queryKey">>
		>(
			(acc, { queryKey, ...query }) => ({
				...acc,
				[queryKey.input
					? `${queryKey.handler}:[${queryKey.input}]`
					: queryKey.handler]: query,
			}),
			{},
		),
		mutations: redactedMutations.reduce<
			Record<string, Omit<(typeof redactedMutations)[number], "mutationKey">[]>
		>(
			(acc, { mutationKey, ...mutation }) => ({
				...acc,
				[mutationKey.handler]: [...(acc[mutationKey.handler] ?? []), mutation],
			}),
			{},
		),
	};
};

const remapActions = (
	actions: ReturnType<ApiManager["getActions"]>,
	keysLists: KeysLists,
) =>
	Object.fromEntries(
		Object.entries(
			actions.reduce<
				Partial<Record<TRPCKey, { clientCalls?: number; serverCalls?: number }>>
			>((acc, [type, name]) => {
				if (shouldIgnoreKey(name, keysLists)) {
					return acc;
				}
				if (!acc[name]) {
					acc[name] = {};
				}
				const callType =
					type === "client"
						? ("clientCalls" as const)
						: ("serverCalls" as const);
				acc[name]![callType] ??= 0;
				acc[name]![callType]! += 1;
				return acc;
			}, {}),
		).sort(([aKey], [bKey]) => aKey.localeCompare(bKey)),
	);

const withNoPlatformPath = (testInfo: TestInfo, fn: () => void) => {
	const originalSnapshotPath = testInfo.snapshotPath;
	testInfo.snapshotPath = (...snapshotPath) =>
		originalSnapshotPath
			.apply(testInfo, snapshotPath)
			.replace(`-${process.platform}`, "");
	fn();
	testInfo.snapshotPath = originalSnapshotPath;
};

type SnapshotQueryCacheOptions = {
	name: string;
	timeout?: number;
	addDefaultBlacklist?: boolean;
	whitelistKeys?: TRPCKey | TRPCKey[];
	blacklistKeys?: TRPCKey | TRPCKey[];
};

export const DEFAULT_BLACKLIST_KEYS: TRPCKey[] = [
	"account.get",
	"currency.getList",
	"receipts.getNonResolvedAmount",
	"debts.getIntentions",
	"accountConnectionIntentions.getAll",
];

type CacheKey<T extends TRPCKey = TRPCKey> = {
	path: T;
	type: T extends TRPCQueryKey ? "query" : "mutation";
	amount?: number;
	awaitLoading?: boolean;
};

type QueriesMixin = {
	snapshotQueries: <T>(
		fn: () => Promise<T>,
		options?: Partial<SnapshotQueryCacheOptions>,
	) => Promise<T>;
	awaitCacheKey: (
		keyOrKeys: CacheKey | CacheKey[],
		timeout?: number,
	) => Promise<boolean[]>;
};

export const queriesMixin = createMixin<
	QueriesMixin,
	NonNullable<unknown>,
	ApiMixin
>({
	snapshotQueries: async ({ page, api }, use, testInfo) => {
		await use(
			async (
				fn,
				{
					blacklistKeys = [],
					whitelistKeys = [],
					addDefaultBlacklist = true,
					name,
					timeout = DEFAULT_AWAIT_CACHE_TIMEOUT,
				} = {},
			) => {
				const blacklistKeysArray = Array.isArray(blacklistKeys)
					? blacklistKeys
					: [blacklistKeys];
				const whitelistKeysArray = Array.isArray(whitelistKeys)
					? whitelistKeys
					: [whitelistKeys];
				const keysLists = {
					blacklistKeys: addDefaultBlacklist
						? [...DEFAULT_BLACKLIST_KEYS, ...blacklistKeysArray]
						: blacklistKeysArray,
					whitelistKeys: whitelistKeysArray,
				} satisfies KeysLists;
				api.clearActions();
				const prevQueryCache = await getQueryCache(page, keysLists, timeout);
				const result = await fn();
				const nextQueryCache = await getQueryCache(page, keysLists, timeout);
				const diff = objectDiff(prevQueryCache, nextQueryCache);
				withNoPlatformPath(testInfo, () => {
					expect
						.soft(`${JSON.stringify(diff, null, "\t")}\n`)
						.toMatchSnapshot(
							getSnapshotName(testInfo, "cacheIndex", name, "json"),
						);
					expect
						.soft(
							`${JSON.stringify(
								remapActions(api.getActions(), keysLists),
								null,
								"\t",
							)}\n`,
						)
						.toMatchSnapshot(
							getSnapshotName(testInfo, "queriesIndex", name, "json"),
						);
				});
				return result;
			},
		);
	},
	awaitCacheKey: async ({ page }, use) => {
		await use((cacheKeyOrKeys, timeout = DEFAULT_AWAIT_CACHE_TIMEOUT) =>
			page.evaluate(
				async ([cacheKeyOrKeysInner, timeoutInner]) => {
					if (!window.queryClient) {
						throw new Error("window.queryClient is not defined yet");
					}
					const cacheKeysInner = Array.isArray(cacheKeyOrKeysInner)
						? cacheKeyOrKeysInner
						: [cacheKeyOrKeysInner];
					const awaitQueryKey = (
						cacheKey: TRPCQueryKey,
						shouldAwaitAmount: boolean,
						amount = 1,
					) => {
						const cache = window.queryClient.getQueryCache();
						const getAwaitedAmount = () => {
							const allMatched = cache.findAll({
								queryKey: [cacheKey.split(".")],
							});
							const resolved = allMatched.filter(
								(element) =>
									element.state.status === "success" ||
									element.state.status === "error",
							);
							return {
								resolved: resolved.length,
								unresolved: allMatched.length - resolved.length,
							};
						};
						const shouldResolve = () => {
							const awaitedAmount = getAwaitedAmount();
							if (awaitedAmount.unresolved !== 0 && shouldAwaitAmount) {
								return false;
							}
							return awaitedAmount.resolved >= amount;
						};
						if (shouldResolve()) {
							return true;
						}
						return new Promise<boolean>((resolve, reject) => {
							cache.subscribe((cacheNotifyEvent) => {
								if (
									cacheNotifyEvent.query.queryKey[0].join(".") !== cacheKey ||
									cacheNotifyEvent.type !== "updated"
								) {
									return;
								}
								if (shouldResolve()) {
									resolve(false);
								}
							});
							setTimeout(reject, timeoutInner);
						});
					};
					const awaitMutationKey = (
						cacheKey: TRPCMutationKey,
						shouldAwaitAmount: boolean,
						amount = 1,
					) => {
						const cache = window.queryClient.getMutationCache();
						const getAwaitedAmount = () => {
							const allMatched = cache.findAll({
								mutationKey: [cacheKey.split(".")],
							});
							const resolved = allMatched.filter(
								(element) =>
									element.state.status === "success" ||
									element.state.status === "error",
							);
							return {
								resolved: resolved.length,
								unresolved: allMatched.length - resolved.length,
							};
						};
						const shouldResolve = () => {
							const awaitedAmount = getAwaitedAmount();
							if (awaitedAmount.unresolved !== 0 && shouldAwaitAmount) {
								return false;
							}
							return awaitedAmount.resolved >= amount;
						};
						if (shouldResolve()) {
							return true;
						}
						return new Promise<boolean>((resolve, reject) => {
							cache.subscribe((cacheNotifyEvent) => {
								if (
									(
										(cacheNotifyEvent.mutation?.options
											.mutationKey?.[0] as string[]) ?? []
									).join(".") !== cacheKey ||
									cacheNotifyEvent.type !== "updated"
								) {
									return;
								}
								if (shouldResolve()) {
									resolve(false);
								}
							});
							setTimeout(reject, timeoutInner);
						});
					};
					return Promise.all(
						cacheKeysInner.map((cacheKeyInner) => {
							if (cacheKeyInner.type >= "query") {
								return awaitQueryKey(
									cacheKeyInner.path as TRPCQueryKey,
									cacheKeyInner.awaitLoading ?? true,
									cacheKeyInner.amount,
								);
							}
							return awaitMutationKey(
								cacheKeyInner.path as TRPCMutationKey,
								cacheKeyInner.awaitLoading ?? true,
								cacheKeyInner.amount,
							);
						}),
					);
				},
				[cacheKeyOrKeys, timeout] as const,
			),
		);
	},
});
