import { recase } from "@kristiandupont/recase";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import type { DehydratedState } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";
import type {
	DeepPartial,
	RouterRecord,
} from "@trpc/server/unstable-core-do-not-import";
import { diff as objectDiff } from "deep-object-diff";
import assert from "node:assert";
import { entries, fromEntries, isNonNullish, mapValues, omitBy } from "remeda";

import type {
	AppRouter,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCQueryInput,
	TRPCQueryKey,
	TRPCSplitMutationKey,
	TRPCSplitQueryKey,
} from "~app/trpc";
import { router } from "~web/handlers";

import type { ApiManager, ApiMixin, TRPCKey } from "./api";
import { createMixin } from "./utils";

const DEFAULT_AWAIT_CACHE_TIMEOUT = 5000;

type ExtendedTestInfo = TestInfo & {
	queriesSnapshotIndex?: number;
	awaitedCacheKeys?: Partial<Record<TRPCQueryKey | TRPCMutationKey, number>>;
};
const getExtendedTestInfo = (testInfo: TestInfo): ExtendedTestInfo =>
	testInfo as ExtendedTestInfo;

const getSnapshotName = (
	testInfo: ExtendedTestInfo,
	key: string,
	overrideName: string | undefined,
) => {
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
		key,
		// Removing baseName "0" by .filter(Boolean) is intended
		overrideName || testInfo.queriesSnapshotIndex,
		"json",
	]
		.filter(Boolean)
		.join(".");
	return [...path, name];
};

export type KeysLists = {
	whitelistKeys: TRPCKey[];
	blacklistKeys: TRPCKey[];
};

const shouldIgnoreKey = (key: TRPCKey, keysLists: KeysLists) =>
	keysLists.blacklistKeys.includes(key) &&
	!keysLists.whitelistKeys.includes(key);

type QueryKeyObject = {
	handler: TRPCQueryKey;
	input: string;
};
const getQueryPath = (queryKeyObject: QueryKeyObject) =>
	queryKeyObject.input
		? `${queryKeyObject.handler}:[${queryKeyObject.input}]`
		: queryKeyObject.handler;

type MutationKeyObject = {
	handler: TRPCMutationKey;
};
const getMutationPath = (mutationKeyObject: MutationKeyObject) =>
	mutationKeyObject.handler;

type QueryCacheOptions = {
	page: Page;
	timeout: number;
	keysLists: KeysLists;
};

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
		const clientErrorMatch = /TRPCClientError: (.*)\n/.exec(error);
		if (clientErrorMatch) {
			return {
				type: "TRPCClientError",
				message: clientErrorMatch[1],
			};
		}
	}
	return error;
};

type RawQueryKey = [
	TRPCSplitQueryKey,
	(
		| {
				input: TRPCQueryInput<TRPCQueryKey>;
				type: "query" | "infinite";
		  }
		| undefined
	),
];

const mapQueries = (queries: DehydratedState["queries"]) =>
	queries
		.sort((a, b) => a.queryHash.localeCompare(b.queryHash))
		.map(({ queryHash, queryKey, ...query }) => {
			const typedQueryKey = queryKey as RawQueryKey;
			return {
				...query,
				queryKey: {
					handler: typedQueryKey[0].join(".") as TRPCQueryKey,
					input: JSON.stringify(typedQueryKey[1]?.input),
				},
				state: {
					...query.state,
					error: flattenError(query.state.error),
					fetchFailureReason: undefined,
					// Removing actual dates as they are not stable for snapshots
					dataUpdatedAt: undefined,
					errorUpdatedAt: undefined,
				},
			};
		});

type RawMutationKey = [TRPCSplitMutationKey];

const mapMutations = (mutations: DehydratedState["mutations"]) =>
	mutations.map((mutation) => {
		const typedMutationKey = mutation.mutationKey as RawMutationKey;
		return {
			...mutation,
			mutationKey: {
				handler: typedMutationKey[0].join(".") as TRPCMutationKey,
			},
			state: {
				...mutation.state,
				context: undefined,
				error: flattenError(mutation.state.error),
				failureReason: undefined,
				// Removing actual dates as they are not stable for snapshots
				submittedAt: undefined,
			},
		};
	});

const getQueryCache = async ({
	page,
	timeout,
	keysLists,
}: QueryCacheOptions) => {
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
				[getQueryPath(queryKey)]: query,
			}),
			{},
		),
		mutations: redactedMutations.reduce<
			Record<string, Omit<(typeof redactedMutations)[number], "mutationKey">[]>
		>(
			(acc, { mutationKey, ...mutation }) => ({
				...acc,
				[getMutationPath(mutationKey)]: [
					...(acc[getMutationPath(mutationKey)] ?? []),
					mutation,
				],
			}),
			{},
		),
	};
};

type KeyCalls = { clientCalls?: number; serverCalls?: number };

const remapActions = (
	actions: ReturnType<ApiManager["getActions"]>,
	keysLists: KeysLists,
) =>
	fromEntries(
		entries(
			actions.reduce<Partial<Record<TRPCKey, KeyCalls>>>(
				(acc, [type, name]) => {
					if (shouldIgnoreKey(name, keysLists)) {
						return acc;
					}
					const keyCalls: KeyCalls = acc[name] || {};
					const callType: keyof KeyCalls =
						type === "client" ? "clientCalls" : "serverCalls";
					keyCalls[callType] = (keyCalls[callType] || 0) + 1;
					acc[name] = keyCalls;
					return acc;
				},
				{},
			),
		).sort(([aKey], [bKey]) => aKey.localeCompare(bKey)),
	);

const withNoPlatformPath = (testInfo: TestInfo, fn: () => void) => {
	/* eslint-disable-next-line @typescript-eslint/unbound-method */
	const originalSnapshotPath = testInfo.snapshotPath;
	testInfo.snapshotPath = (...snapshotPath) =>
		originalSnapshotPath
			.apply(testInfo, snapshotPath)
			.replace(`-${process.platform}`, "");
	fn();
	testInfo.snapshotPath = originalSnapshotPath;
};

export const getMutationsByKey = <T extends TRPCMutationKey>(
	cache: Awaited<ReturnType<typeof getQueryCache>>,
	key: T,
) => {
	const mutations = cache.mutations[key];
	if (!mutations) {
		throw new Error(`Expected to have ${key} in cache`);
	}
	return mutations.map((mutation) => {
		type MutationType = typeof mutation;
		return mutation as Omit<MutationType, "state"> & {
			state: Omit<MutationType["state"], "data" | "variables" | "error"> & {
				data: TRPCMutationOutput<T>;
				variables: TRPCMutationInput<T>;
				error: {
					type: string;
					message: string;
				};
			};
		};
	});
};

type SnapshotQueryCacheOptions = {
	name: string;
	timeout?: number;
	addDefaultBlacklist?: boolean;
	whitelistKeys?: TRPCKey | TRPCKey[];
	blacklistKeys?: TRPCKey | TRPCKey[];
	skipCache?: boolean;
	skipQueries?: boolean;
};

export const DEFAULT_BLACKLIST_KEYS: TRPCKey[] = [
	"account.get",
	"currency.getList",
	"receipts.getNonResolvedAmount",
	"debts.getIntentions",
	"accountConnectionIntentions.getAll",
	"receiptTransferIntentions.getAll",
];

type AwaitCacheDescription<T extends TRPCKey = TRPCKey> = {
	path: T;
	amount?: number;
};
type AwaitCacheOrKey<T extends TRPCKey = TRPCKey> =
	| T
	| AwaitCacheDescription<T>;
type AwaitCacheObject<T extends TRPCKey = TRPCKey> = {
	path: T;
	amount: number;
	type: "query" | "mutation";
};

const getProcedure = (
	currentRouter: AnyTRPCRouter & RouterRecord,
	path: string,
): AnyTRPCProcedure => {
	const [first, ...rest] = path.split(".");
	assert(first);
	if (rest.length === 0) {
		return currentRouter[first] as AnyTRPCProcedure;
	}
	return getProcedure(
		currentRouter[first] as AnyTRPCRouter & RouterRecord,
		rest.join("."),
	);
};

const getCountFactory = (prevCache: QueryCache, nextCache: QueryCache) => ({
	getQueryCount: (
		queryKey: TRPCQueryKey,
		key: "dataUpdateCount" | "errorUpdateCount" | "fetchFailureCount",
	) => {
		const nextCount = nextCache.queries[queryKey]?.state[key] ?? 0;
		const prevCount = prevCache.queries[queryKey]?.state[key] ?? 0;
		const diffCount = nextCount - prevCount;
		return diffCount === 0 ? undefined : diffCount;
	},
	getMutationCount: (
		mutationKey: TRPCMutationKey,
		index: number,
		key: "failureCount",
	) => {
		const nextCount =
			nextCache.mutations[mutationKey]?.[index]?.state[key] ?? 0;
		const prevCount =
			prevCache.mutations[mutationKey]?.[index]?.state[key] ?? 0;
		const diffCount = nextCount - prevCount;
		return diffCount === 0 ? undefined : diffCount;
	},
});

type QueryCache = Awaited<ReturnType<typeof getQueryCache>>;
const getDiff = (prevCache: QueryCache, nextCache: QueryCache) => {
	const diff = objectDiff(prevCache, nextCache) as DeepPartial<QueryCache>;
	const { getQueryCount, getMutationCount } = getCountFactory(
		prevCache,
		nextCache,
	);
	return omitBy(
		{
			queries: diff.queries
				? mapValues(diff.queries, (query, key) => {
						if (!query?.state) {
							return query;
						}
						const queryKey = key as TRPCQueryKey;
						return {
							...query,
							state: omitBy(
								{
									...query.state,
									dataUpdateCount: getQueryCount(queryKey, "dataUpdateCount"),
									errorUpdateCount: getQueryCount(queryKey, "errorUpdateCount"),
									fetchFailureCount: getQueryCount(
										queryKey,
										"fetchFailureCount",
									),
								},
								(value) => value === undefined,
							),
						};
				  })
				: undefined,
			mutations: diff.mutations
				? mapValues(diff.mutations, (mutations, key) => {
						const mapMutation = (
							mutation: NonNullable<NonNullable<typeof mutations>[number]>,
							index: number | string | symbol,
						) => {
							if (!mutation.state) {
								return mutation;
							}
							const mutationKey = key as TRPCMutationKey;
							return {
								...mutation,
								state: omitBy(
									{
										...mutation.state,
										failureCount: getMutationCount(
											mutationKey,
											Number(index),
											"failureCount",
										),
									},
									(value) => value === undefined,
								),
							};
						};
						if (Array.isArray(mutations)) {
							return mutations.filter(isNonNullish).map(mapMutation);
						}
						// Case of diff for a single mutation - array is convert to an object with partial keys
						// eslint-disable-next-line prefer-object-spread
						return mapValues(Object.assign({}, mutations), mapMutation);
				  })
				: undefined,
		},
		(value) => value === undefined,
	);
};

type QueriesMixin = {
	snapshotQueries: <T>(
		fn: () => Promise<T>,
		options?: Partial<SnapshotQueryCacheOptions>,
	) => Promise<{
		result: T;
		actions: ReturnType<ApiManager["getActions"]>;
		prevQueryCache: Awaited<ReturnType<typeof getQueryCache>>;
		nextQueryCache: Awaited<ReturnType<typeof getQueryCache>>;
		diff: object;
	}>;
	awaitCacheKey: (
		keyOrKeys: AwaitCacheOrKey | AwaitCacheOrKey[],
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
					skipCache = false,
					skipQueries = false,
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
				const prevQueryCache = await getQueryCache({
					page,
					keysLists,
					timeout,
				});
				const result = await fn();
				const nextQueryCache = await getQueryCache({
					page,
					keysLists,
					timeout,
				});
				const diff = getDiff(prevQueryCache, nextQueryCache);
				const actions = api.getActions();
				const extendedTestInfo = getExtendedTestInfo(testInfo);
				extendedTestInfo.queriesSnapshotIndex ??= 0;
				withNoPlatformPath(testInfo, () => {
					if (!skipCache) {
						expect
							.soft(
								`${JSON.stringify(
									diff,
									(_, value: unknown) =>
										value === undefined ? "<undefined>" : value,
									"\t",
								)}\n`,
							)
							.toMatchSnapshot(
								getSnapshotName(extendedTestInfo, "cache", name),
							);
					}
					if (!skipQueries) {
						expect
							.soft(
								`${JSON.stringify(
									remapActions(actions, keysLists),
									null,
									"\t",
								)}\n`,
							)
							.toMatchSnapshot(
								getSnapshotName(extendedTestInfo, "queries", name),
							);
					}
				});
				if (!name && !(skipQueries && skipCache)) {
					extendedTestInfo.queriesSnapshotIndex += 1;
				}
				return {
					result,
					actions,
					prevQueryCache,
					nextQueryCache,
					diff,
				};
			},
		);
	},
	awaitCacheKey: async ({ page }, use, testInfo) => {
		const extendedTestInfo = getExtendedTestInfo(testInfo);
		const awaitedCacheKeys = extendedTestInfo.awaitedCacheKeys || {};
		extendedTestInfo.awaitedCacheKeys = awaitedCacheKeys;
		await use((cacheKeyOrKeys, timeout = DEFAULT_AWAIT_CACHE_TIMEOUT) => {
			const cacheObjects = (
				Array.isArray(cacheKeyOrKeys) ? cacheKeyOrKeys : [cacheKeyOrKeys]
			).map<AwaitCacheObject>((keyOrObject) => {
				const path =
					typeof keyOrObject === "string" ? keyOrObject : keyOrObject.path;
				const awaitedAmount =
					typeof keyOrObject === "string" ? 1 : keyOrObject.amount ?? 1;
				const prevAmount = awaitedCacheKeys[path] ?? 0;
				const procedure = getProcedure(
					router as unknown as AnyTRPCRouter & RouterRecord,
					path,
				);
				return {
					path,
					amount: awaitedAmount + prevAmount,
					// eslint-disable-next-line no-underscore-dangle
					type: procedure._def.type === "query" ? "query" : "mutation",
				};
			});
			const result = page.evaluate(
				async ([cacheObjectsInner, timeoutInner]) => {
					const { queryClient } = window;
					if (!queryClient) {
						throw new Error("window.queryClient is not defined yet");
					}
					const awaitQueryKey = (cacheKey: TRPCQueryKey, amount: number) => {
						const cache = queryClient.getQueryCache();
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
							if (awaitedAmount.unresolved !== 0) {
								return false;
							}
							return awaitedAmount.resolved >= amount;
						};
						if (shouldResolve()) {
							return true;
						}
						return new Promise<boolean>((resolve, reject) => {
							cache.subscribe((cacheNotifyEvent) => {
								const queryKey = cacheNotifyEvent.query.queryKey as RawQueryKey;
								if (
									queryKey[0].join(".") !== cacheKey ||
									cacheNotifyEvent.type !== "updated"
								) {
									return;
								}
								if (shouldResolve()) {
									resolve(false);
								}
							});
							setTimeout(() => {
								const lastAmounts = getAwaitedAmount();
								reject(
									new Error(
										`Query await for "${cacheKey}" failed after ${timeoutInner}${
											amount > 1
												? `, expected ${amount} entries, got ${
														lastAmounts.resolved
												  } entries${
														lastAmounts.unresolved
															? ` (and ${lastAmounts.unresolved} entries)`
															: ""
												  }`
												: ""
										}`,
									),
								);
							}, timeoutInner);
						});
					};
					const awaitMutationKey = (
						cacheKey: TRPCMutationKey,
						amount: number,
					) => {
						const cache = queryClient.getMutationCache();
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
							if (awaitedAmount.unresolved !== 0) {
								return false;
							}
							return awaitedAmount.resolved >= amount;
						};
						if (shouldResolve()) {
							return true;
						}
						return new Promise<boolean>((resolve, reject) => {
							cache.subscribe((cacheNotifyEvent) => {
								const mutationKey = cacheNotifyEvent.mutation?.options
									.mutationKey as RawMutationKey | undefined;
								if (
									(mutationKey?.[0] ?? []).join(".") !== cacheKey ||
									cacheNotifyEvent.type !== "updated"
								) {
									return;
								}
								if (shouldResolve()) {
									resolve(false);
								}
							});
							setTimeout(() => {
								const lastAmounts = getAwaitedAmount();
								reject(
									new Error(
										`Mutation await for "${cacheKey}" failed after ${timeoutInner}${
											amount > 1
												? `, expected ${amount} entries, got ${
														lastAmounts.resolved
												  } entries${
														lastAmounts.unresolved
															? ` (and ${lastAmounts.unresolved} entries)`
															: ""
												  }`
												: ""
										}`,
									),
								);
							}, timeoutInner);
						});
					};
					return Promise.all(
						cacheObjectsInner.map((cacheObject) => {
							if (cacheObject.type === "query") {
								return awaitQueryKey(
									cacheObject.path as TRPCQueryKey,
									cacheObject.amount,
								);
							}
							return awaitMutationKey(
								cacheObject.path as TRPCMutationKey,
								cacheObject.amount,
							);
						}),
					);
				},
				[cacheObjects, timeout] as const,
			);
			cacheObjects.forEach((cacheKey) => {
				awaitedCacheKeys[cacheKey.path] ??= 0;
				awaitedCacheKeys[cacheKey.path] = cacheKey.amount;
			});
			return result;
		});
	},
});
