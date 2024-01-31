import { recase } from "@kristiandupont/recase";
import type { Expect, Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { type TRPCClientErrorLike } from "@trpc/client";
import { diff as objectDiff } from "deep-object-diff";
import joinImages from "join-images";

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

export type KeysLists = {
	whitelistKeys: TRPCKey[];
	blacklistKeys: TRPCKey[];
};

const shouldIgnoreKey = (key: TRPCKey, keysLists: KeysLists) =>
	keysLists.blacklistKeys.includes(key) &&
	!keysLists.whitelistKeys.includes(key);

const getQueryCache = (page: Page, keysLists: KeysLists, timeout: number) =>
	page.evaluate(
		async ([keysListsInner, timeoutInner]) => {
			const shouldIgnoreKeyInner = (key: TRPCKey) =>
				keysListsInner.blacklistKeys.includes(key) &&
				!keysListsInner.whitelistKeys.includes(key);
			if (!window.getDehydratedCache) {
				return { mutations: [], queries: [] };
			}
			const cache = await window.getDehydratedCache(timeoutInner);
			const flattenError = (error: unknown) => {
				if (
					(error instanceof Error && error.name === "TRPCClientError") ||
					(typeof error === "object" && error && "shape" in error)
				) {
					const trpcError = error as TRPCClientErrorLike<AppRouter>;
					return {
						message: trpcError.message,
						data: trpcError.data
							? {
									code: trpcError.data.code,
									httpStatus: trpcError.data.httpStatus,
									path: trpcError.data.path,
									stack: "<redacted>",
							  }
							: undefined,
					};
				}
				return error;
			};
			const redactedQueries = cache.queries
				.sort((a, b) => a.queryHash.localeCompare(b.queryHash))
				.map(({ queryHash, queryKey, ...query }) => {
					const typedQueryKey = queryKey as [
						string[],
						{ input: TRPCQueryInput<TRPCQueryKey>; type: "query" | "infinite" },
					];
					return {
						...query,
						queryKey: {
							handler: typedQueryKey[0].join(".") as TRPCKey,
							input: JSON.stringify(typedQueryKey[1]?.input),
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
					};
				})
				.filter((query) => !shouldIgnoreKeyInner(query.queryKey.handler));
			type QueriesRecord = Record<
				string,
				Omit<(typeof redactedQueries)[number], "queryKey">
			>;
			const redactedMutations = cache.mutations
				.map((mutation) => {
					const mutationKey = mutation.mutationKey as [string[]];
					return {
						...mutation,
						mutationKey: {
							handler: mutationKey[0].join(".") as TRPCKey,
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
					};
				})
				.filter(
					(mutation) => !shouldIgnoreKeyInner(mutation.mutationKey.handler),
				);
			type MutationsRecord = Record<
				string,
				Omit<(typeof redactedMutations)[number], "mutationKey">
			>;
			const lastMutationIds: Partial<Record<TRPCKey, number>> = {};
			return {
				queries: redactedQueries.reduce<QueriesRecord>(
					(acc, { queryKey, ...query }) => ({
						...acc,
						[queryKey.input
							? `${queryKey.handler}:[${queryKey.input}]`
							: queryKey.handler]: query,
					}),
					{},
				),
				mutations: redactedMutations.reduce<MutationsRecord>(
					(acc, { mutationKey, ...mutation }) => {
						lastMutationIds[mutationKey.handler] ??= 0;
						lastMutationIds[mutationKey.handler]! += 1;
						const lastMutationId = lastMutationIds[mutationKey.handler]!;
						return {
							...acc,
							[lastMutationId === 1
								? mutationKey.handler
								: `${mutationKey.handler}[${lastMutationId - 1}]`]: mutation,
						};
					},
					{},
				),
			};
		},
		[keysLists, timeout] as const,
	);

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
	expectScreenshotWithSchemes: (
		name: string,
		options?: Parameters<Page["stableScreenshot"]>[0] &
			Parameters<
				ReturnType<Expect<NonNullable<unknown>>>["toMatchSnapshot"]
			>[0],
	) => Promise<void>;
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
	expectScreenshotWithSchemes: async ({ page }, use) => {
		await use(
			async (
				name,
				{
					maxDiffPixelRatio,
					maxDiffPixels,
					threshold,
					fullPage = true,
					mask = [page.getByTestId("sticky-menu")],
					animations = "disabled",
					...restScreenshotOptions
				} = {},
			) => {
				const screenshotOptions = {
					fullPage,
					mask,
					animations,
					...restScreenshotOptions,
				};
				await page.emulateMedia({ colorScheme: "light" });
				const lightImage = await page.stableScreenshot(screenshotOptions);
				await page.emulateMedia({ colorScheme: "dark" });
				const darkImage = await page.stableScreenshot(screenshotOptions);

				const mergedImage = await joinImages([lightImage, darkImage], {
					direction: "horizontal",
					color: "#00ff00",
				});
				await expect
					.soft(await mergedImage.toFormat("png").toBuffer())
					.toMatchSnapshot(name, {
						maxDiffPixelRatio,
						maxDiffPixels,
						threshold,
					});
			},
		);
	},
});
