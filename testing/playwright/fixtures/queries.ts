import { recase } from "@kristiandupont/recase";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import type { DehydratedState, Mutation, Query } from "@tanstack/react-query";
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

import { type ApiManager, type TRPCKey, apiFixtures as test } from "./api";

const DEFAULT_AWAIT_CACHE_TIMEOUT = 5000;

type ExtendedTestInfo = TestInfo & {
	queriesSnapshotIndex?: number;
	awaitedCacheKeys?: Partial<
		Record<TRPCQueryKey | TRPCMutationKey, ActualAwaitAmounts>
	>;
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
	if (typeof error === "object" && error && "message" in error) {
		const clientLikeError = error as TRPCClientErrorLike<AppRouter>;
		return {
			type: "TRPCClientError",
			message: clientLikeError.message,
		};
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
			.call(testInfo, ...snapshotPath)
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
	"debtIntentions.getAll",
	"accountConnectionIntentions.getAll",
	"receiptTransferIntentions.getAll",
];

type AmountsWith<T> = { succeed: T; errored: T };
type RangeAwaitAmount = { min: number; max: number };
type ActualAwaitAmounts = AmountsWith<number>;
type ExpectedAwaitAmounts = AmountsWith<RangeAwaitAmount>;
type AwaitOptions = {
	awaitLoading: boolean;
	total: boolean;
};
type AwaitOptionsObject =
	| number
	| ((
			| Partial<RangeAwaitAmount>
			| Partial<AmountsWith<number | Partial<RangeAwaitAmount>>>
	  ) &
			Partial<AwaitOptions>);

const getAmountElement = (
	element?: number | Partial<RangeAwaitAmount>,
): RangeAwaitAmount => {
	if (!element) {
		return { min: 0, max: Infinity };
	}
	if (typeof element === "number") {
		return { min: element, max: element };
	}
	return {
		min: element.min ?? 0,
		max: element.min ?? Infinity,
	};
};

const getAmount = (
	optionsObject: AwaitOptionsObject = { min: 1, max: Infinity },
): ExpectedAwaitAmounts => {
	if (typeof optionsObject === "number") {
		return {
			succeed: { min: optionsObject, max: optionsObject },
			errored: { min: 0, max: Infinity },
		};
	}
	if ("min" in optionsObject || "max" in optionsObject) {
		const typedAmount = optionsObject as Partial<RangeAwaitAmount>;
		return {
			succeed: {
				min: typedAmount.min ?? 0,
				max: typedAmount.max ?? Infinity,
			},
			errored: { min: 0, max: Infinity },
		};
	}
	const typedAmount = optionsObject as Partial<
		AmountsWith<number | Partial<RangeAwaitAmount>>
	>;
	return {
		succeed: getAmountElement(typedAmount.succeed),
		errored: getAmountElement(typedAmount.errored),
	};
};

const getOptions = (optionsObject: AwaitOptionsObject = 0): AwaitOptions => {
	if (typeof optionsObject === "number") {
		return { awaitLoading: true, total: false };
	}
	return {
		awaitLoading: optionsObject.awaitLoading ?? true,
		total: optionsObject.total ?? false,
	};
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

type QueriesFixtures = {
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
	awaitCacheKey: <K extends TRPCKey>(
		key: K,
		options?: AwaitOptionsObject,
		timeout?: number,
	) => Promise<void>;
};

export const queriesFixtures = test.extend<QueriesFixtures>({
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
		await use(
			async (path, optionsObject, timeout = DEFAULT_AWAIT_CACHE_TIMEOUT) => {
				const procedure = getProcedure(
					router as unknown as AnyTRPCRouter & RouterRecord,
					path,
				);
				const nextAmounts = await page.evaluate(
					async ([
						pathInner,
						prevAmountsInner,
						expectedAmountsInner,
						optionsInner,
						typeInner,
						timeoutInner,
					]) => {
						const { queryClient } = window;
						if (!queryClient) {
							throw new Error("window.queryClient is not defined yet");
						}
						const getActualFactory =
							(getMatched: () => Query[] | Mutation[]) => () => {
								const matched = getMatched();
								const succeed = matched.filter(
									(element) => element.state.status === "success",
								);
								const errored = matched.filter(
									(element) => element.state.status === "error",
								);
								return {
									succeed: succeed.length,
									errored: errored.length,
									unresolved: matched.length - errored.length - succeed.length,
								};
							};
						const formatExpectedRange = (expected: RangeAwaitAmount) => {
							if (expected.min === expected.max) {
								return `${expected.max}`;
							}
							if (expected.max === Infinity) {
								return `${expected.min}+`;
							}
							return `${expected.min}-${expected.max}`;
						};
						const isResolved = (
							actualAmounts: ActualAwaitAmounts & { unresolved: number },
							prevAmounts: ActualAwaitAmounts,
							expectedAmounts: ExpectedAwaitAmounts,
							options: AwaitOptions,
						) => {
							if (actualAmounts.unresolved !== 0 && options.awaitLoading) {
								return false;
							}
							const accountedAmounts = {
								errored:
									actualAmounts.errored -
									(options.total ? 0 : prevAmounts.errored),
								succeed:
									actualAmounts.succeed -
									(options.total ? 0 : prevAmounts.succeed),
							};
							return (
								accountedAmounts.errored >= expectedAmounts.errored.min &&
								accountedAmounts.errored <= expectedAmounts.errored.max &&
								accountedAmounts.succeed >= expectedAmounts.succeed.min &&
								accountedAmounts.succeed <= expectedAmounts.succeed.max
							);
						};
						const awaitKey = async (
							name: string,
							key: string,
							prevAmounts: ActualAwaitAmounts,
							expectedAmounts: ExpectedAwaitAmounts,
							options: AwaitOptions,
							getElements: () => Query[] | Mutation[],
							subscribeCache: (resolve: () => void) => () => void,
						) => {
							const getActual = getActualFactory(getElements);
							const immediateActual = getActual();
							if (
								isResolved(
									immediateActual,
									prevAmounts,
									expectedAmounts,
									options,
								)
							) {
								return immediateActual;
							}
							return new Promise<ActualAwaitAmounts>((resolve, reject) => {
								const unsubscribe = subscribeCache(() => {
									const actual = getActual();
									if (
										isResolved(actual, prevAmounts, expectedAmounts, options)
									) {
										resolve(actual);
									}
								});
								setTimeout(() => {
									const { succeed, errored, unresolved } = getActual();
									unsubscribe();
									reject(
										new Error(
											`${name} await for "${key}" failed after ${timeoutInner}\n${[
												`Succeed entries: expected ${formatExpectedRange(
													expectedAmounts.succeed,
												)}, got ${succeed}`,
												expectedAmounts.errored.min !== 0
													? `Errored entries: expected ${formatExpectedRange(
															expectedAmounts.errored,
													  )}, got ${errored}`
													: undefined,
												options.awaitLoading && unresolved !== 0
													? `${unresolved} unresolved entries`
													: undefined,
											]
												.filter(Boolean)
												.join("; ")}`,
										),
									);
								}, timeoutInner);
							});
						};
						const awaitQueryKey = (
							cacheKey: TRPCQueryKey,
							prevAmounts: ActualAwaitAmounts,
							expectedAmounts: ExpectedAwaitAmounts,
							options: AwaitOptions,
						): Promise<ActualAwaitAmounts> => {
							const cache = queryClient.getQueryCache();
							return awaitKey(
								"Query",
								cacheKey,
								prevAmounts,
								expectedAmounts,
								options,
								() => cache.findAll({ queryKey: [cacheKey.split(".")] }),
								(resolve) =>
									cache.subscribe((cacheNotifyEvent) => {
										const queryKey = cacheNotifyEvent.query
											.queryKey as RawQueryKey;
										if (
											queryKey[0].join(".") !== cacheKey ||
											cacheNotifyEvent.type !== "updated"
										) {
											return;
										}
										resolve();
									}),
							);
						};
						const awaitMutationKey = (
							cacheKey: TRPCMutationKey,
							prevAmounts: ActualAwaitAmounts,
							expectedAmounts: ExpectedAwaitAmounts,
							options: AwaitOptions,
						) => {
							const cache = queryClient.getMutationCache();
							return awaitKey(
								"Mutation",
								cacheKey,
								prevAmounts,
								expectedAmounts,
								options,
								() => cache.findAll({ mutationKey: [cacheKey.split(".")] }),
								(resolve) =>
									cache.subscribe((cacheNotifyEvent) => {
										const mutationKey = cacheNotifyEvent.mutation?.options
											.mutationKey as RawMutationKey | undefined;
										if (
											(mutationKey?.[0] ?? []).join(".") !== cacheKey ||
											cacheNotifyEvent.type !== "updated"
										) {
											return;
										}
										resolve();
									}),
							);
						};
						switch (typeInner) {
							case "query":
								return awaitQueryKey(
									pathInner as TRPCQueryKey,
									prevAmountsInner,
									expectedAmountsInner,
									optionsInner,
								);
							case "mutation":
								return awaitMutationKey(
									pathInner as TRPCMutationKey,
									prevAmountsInner,
									expectedAmountsInner,
									optionsInner,
								);
						}
					},
					[
						path,
						awaitedCacheKeys[path] ?? {
							succeed: 0,
							errored: 0,
						},
						getAmount(optionsObject),
						getOptions(optionsObject),
						// eslint-disable-next-line no-underscore-dangle
						procedure._def.type === "query" ? "query" : "mutation",
						timeout,
					] as const,
				);
				awaitedCacheKeys[path] = nextAmounts;
			},
		);
	},
});
