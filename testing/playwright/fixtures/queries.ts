import { recase } from "@kristiandupont/recase";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { type TRPCClientErrorLike } from "@trpc/client";
import type { QueryKey } from "@trpc/react-query/src/internals/getArrayQueryKey";
import { diff as objectDiff } from "deep-object-diff";

import type { TRPCQueryKey } from "app/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

import type { Action, ApiManager, TRPCKey } from "./api";

type SnapshotNames = {
	queriesIndex?: number;
	cacheIndex?: number;
};

const getSnapshotNames = (testInfo: TestInfo): SnapshotNames => {
	const snapshotNamesSymbol = Object.getOwnPropertySymbols(testInfo).find(
		(symbol) => symbol.description === "snapshotNames",
	)!;
	const testInfoExtended = testInfo as TestInfo & {
		[key: typeof snapshotNamesSymbol]: SnapshotNames;
	};
	testInfoExtended[snapshotNamesSymbol] ??= {};
	return testInfoExtended[snapshotNamesSymbol] as SnapshotNames;
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

const getQueryCache = (page: Page, ignoreKeys: TRPCKey[]) =>
	page.evaluate(
		([ignoreKeysInner]) => {
			if (!window.getDehydratedCache) {
				return { mutations: [], queries: [] };
			}
			const cache = window.getDehydratedCache();
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
					const typedQueryKey = queryKey as QueryKey;
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
							dataUpdatedAt: query.state.dataUpdatedAt ? -1 : 0,
							errorUpdatedAt: query.state.errorUpdatedAt ? -1 : 0,
						},
					};
				})
				.filter((query) => !ignoreKeysInner!.includes(query.queryKey.handler));
			type QueriesRecord = Record<
				string,
				Omit<(typeof redactedQueries)[number], "queryKey">
			>;
			const redactedMutations = cache.mutations
				.map((mutation) => {
					const mutationKey = mutation.mutationKey as QueryKey;
					return {
						...mutation,
						mutationKey: {
							handler: mutationKey[0].join(".") as TRPCKey,
							input: JSON.stringify(mutationKey[1]?.input),
						},
						state: {
							...mutation.state,
							context: undefined,
							error: flattenError(mutation.state.error),
							failureReason: undefined,
						},
					};
				})
				.filter(
					(mutation) =>
						!ignoreKeysInner!.includes(mutation.mutationKey.handler),
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
		[ignoreKeys],
	);

const remapActions = (actions: Action[]) =>
	Object.fromEntries(
		Object.entries(
			actions.reduce<
				Partial<Record<TRPCKey, { clientCalls?: number; serverCalls?: number }>>
			>((acc, [type, name]) => {
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

export type SnapshotQueryCacheOptions = {
	name: string;
	ignoreKeys: TRPCKey[];
};

const DEFAULT_IGNORE_KEYS: TRPCKey[] = [
	"receipts.getNonResolvedAmount",
	"debts.getIntentions",
	"accountConnectionIntentions.getAll",
];

export const expectQueriesSnapshot = async <T>(
	page: Page,
	api: ApiManager,
	testInfo: TestInfo,
	fn: () => Promise<T>,
	{
		ignoreKeys = DEFAULT_IGNORE_KEYS,
		name,
	}: Partial<SnapshotQueryCacheOptions> = {},
): Promise<T> => {
	api.clearActions();
	const prevQueryCache = await getQueryCache(page, ignoreKeys);
	const result = await fn();
	const nextQueryCache = await getQueryCache(page, ignoreKeys);
	const diff = objectDiff(prevQueryCache, nextQueryCache);
	withNoPlatformPath(testInfo, () => {
		expect
			.soft(`${JSON.stringify(diff, null, "\t")}\n`)
			.toMatchSnapshot(getSnapshotName(testInfo, "cacheIndex", name, "json"));
		expect
			.soft(`${JSON.stringify(remapActions(api.getActions()), null, "\t")}\n`)
			.toMatchSnapshot(getSnapshotName(testInfo, "queriesIndex", name, "json"));
	});
	return result;
};

export const awaitQuery = <T extends TRPCQueryKey>(
	page: Page,
	awaitedKey: T,
	timeout = 10000,
): Promise<void> =>
	page.evaluate(
		([awaitedKeyInner, timeoutInner]) => {
			if (!window.subscribeToQuery) {
				return Promise.reject(
					new Error("window.subscribeToQuery is not defined yet"),
				);
			}
			return new Promise((resolve, reject) => {
				window.subscribeToQuery(awaitedKeyInner, (event) => {
					if (event.type !== "updated") {
						return;
					}
					if (event.action.type === "success") {
						resolve();
					}
				});
				setTimeout(reject, timeoutInner);
			});
		},
		[awaitedKey, timeout] as const,
	);
