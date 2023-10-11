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
	return name;
};

const getQueryCache = (page: Page) =>
	page.evaluate(() => {
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
		return {
			queries: cache.queries.map((query) => ({
				...query,
				state: {
					...query.state,
					error: flattenError(query.state.error),
					fetchFailureReason: undefined,
				},
			})),
			mutations: cache.mutations.map((mutation) => ({
				...mutation,
				state: {
					...mutation.state,
					error: flattenError(mutation.state.error),
					failureReason: undefined,
				},
			})),
		};
	});

type QueryCache = Awaited<ReturnType<typeof getQueryCache>>;

const filterCache = (cache: QueryCache, ignoreKeys?: TRPCKey[]) => {
	if (!ignoreKeys) {
		return cache;
	}
	return {
		queries: cache.queries
			.filter(
				(query) =>
					!ignoreKeys.includes(
						(query.queryKey as QueryKey)[0].join(".") as TRPCKey,
					),
			)
			.map(({ queryHash, ...query }) => ({
				...query,
				state: {
					...query.state,
					// Removing actual dates as they are not stable for snapshots
					dataUpdatedAt: query.state.dataUpdatedAt ? -1 : 0,
					errorUpdatedAt: query.state.errorUpdatedAt ? -1 : 0,
				},
			})),
		mutations: cache.mutations.filter(
			(mutation) =>
				!ignoreKeys.includes(
					(mutation.mutationKey as [string[]])[0].join(".") as TRPCKey,
				),
		),
	};
};

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
	testInfo.snapshotPath = (snapshotName) =>
		originalSnapshotPath
			.call(testInfo, snapshotName)
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
	const prevQueryCache = await getQueryCache(page);
	const result = await fn();
	const nextQueryCache = await getQueryCache(page);
	const diff = objectDiff(
		filterCache(prevQueryCache, ignoreKeys),
		filterCache(nextQueryCache, ignoreKeys),
	);
	withNoPlatformPath(testInfo, () => {
		expect
			.soft(`${JSON.stringify(diff, null, "\t")}\n`)
			.toMatchSnapshot(getSnapshotName(testInfo, "cacheIndex", name, "json"));
		expect
			.soft(`${JSON.stringify(remapActions(api.getActions()), null, "\t")}\n`)
			.toMatchSnapshot(getSnapshotName(testInfo, "queriesIndex", name, "json"));
	});
	api.clearActions();
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
