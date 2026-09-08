import type { Page } from "@playwright/test";
import { hashKey } from "@tanstack/react-query";
import type { DehydratedState } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import { diff as objectDiff } from "deep-object-diff";
import {
	entries,
	fromEntries,
	isNonNullish,
	isObjectType,
	mapValues,
	omit,
	omitBy,
} from "remeda";

import type {
	AppRouter,
	RawMutationKey,
	RawQueryKey,
	TRPCKey,
	TRPCMutationInput,
	TRPCMutationKey,
	TRPCMutationOutput,
	TRPCQueryKey,
} from "~app/trpc";
import type { ApiManager } from "~tests/frontend/fixtures/api";
import { isTemporalObject, serialize } from "~utils/date";
import { transformer } from "~utils/transformer";
import type { DeepPartial } from "~utils/types";

const DEFAULT_SNAPSHOT_TIMEOUT = 5000;

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
	timeout?: number;
	keysLists: KeysLists;
};

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

const serializeData = (input: unknown): unknown => {
	if (Array.isArray(input)) {
		return input.map((element) => serializeData(element));
	}
	if (isTemporalObject(input)) {
		return serialize(input);
	}
	if (isObjectType(input)) {
		return mapValues(input, (value) => serializeData(value));
	}
	return input;
};
const hydrateData = (input: unknown): unknown =>
	input
		? serializeData(
				transformer.deserialize(
					input as Parameters<(typeof transformer)["deserialize"]>[0],
				),
			)
		: input;

const mapQueries = (queries: DehydratedState["queries"]) =>
	queries
		.toSorted((a, b) => a.queryHash.localeCompare(b.queryHash))
		.map(({ queryKey, ...query }) => {
			const typedQueryKey = queryKey as RawQueryKey;
			return {
				...omit(query, ["queryHash", "dehydratedAt"]),
				queryKey: {
					handler: typedQueryKey[0].join(".") as TRPCQueryKey,
					input: hashKey(typedQueryKey[1]?.input ?? []),
				},
				state: {
					...query.state,
					data: hydrateData(query.state.data),
					error: flattenError(query.state.error),
					fetchFailureReason: undefined,
					// Removing actual dates as they are not stable for snapshots
					dataUpdatedAt: undefined,
					errorUpdatedAt: undefined,
				},
			};
		});

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
				variables: hydrateData(mutation.state.variables),
				data: hydrateData(mutation.state.data),
				error: flattenError(mutation.state.error),
				failureReason: undefined,
				// Removing actual dates as they are not stable for snapshots
				submittedAt: undefined,
			},
		};
	});

export const getDehydratedCache = async ({
	page,
	timeout = DEFAULT_SNAPSHOT_TIMEOUT,
	keysLists,
}: QueryCacheOptions) => {
	const cache = await page.evaluate(
		([timeoutInner]) => {
			const { getDehydratedCache: getCache } = window;
			if (!getCache) {
				return { mutations: [], queries: [] };
			}
			return getCache(timeoutInner);
		},
		[timeout] as const,
	);
	const redactedQueries = mapQueries(cache.queries).filter(
		(query) => !shouldIgnoreKey(query.queryKey.handler, keysLists),
	);
	const redactedMutations = mapMutations(cache.mutations).filter(
		(mutation) => !shouldIgnoreKey(mutation.mutationKey.handler, keysLists),
	);
	return {
		queries: fromEntries(
			redactedQueries.map(({ queryKey, ...query }) => [
				getQueryPath(queryKey),
				query,
			]),
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

export const remapActions = (
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
					return { ...acc, [name]: keyCalls };
				},
				{},
			),
		).toSorted(([aKey], [bKey]) => aKey.localeCompare(bKey)),
	);

export const getMutationsByKey = <T extends TRPCMutationKey>(
	cache: Awaited<ReturnType<typeof getDehydratedCache>>,
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

type QueryCache = Awaited<ReturnType<typeof getDehydratedCache>>;
export const getDiff = (prevCache: QueryCache, nextCache: QueryCache) => {
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
						// oxlint-disable-next-line prefer-object-spread
						return mapValues(Object.assign({}, mutations), mapMutation);
					})
				: undefined,
		},
		(value) => value === undefined,
	);
};
