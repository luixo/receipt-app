import { expect } from "@playwright/test";

import type { TRPCKey } from "~app/trpc";
import type { KeysLists } from "~tests/frontend/utils/queries";
import {
	getDehydratedCache,
	getDiff,
	remapActions,
} from "~tests/frontend/utils/queries";
import {
	addAttachment,
	getSnapshotName,
} from "~tests/frontend/utils/test-info";

import { apiFixtures as test } from "./api";
import type { ApiManager } from "./api";

type SnapshotQueryCacheOptions = {
	name: string;
	timeout?: number;
	addDefaultBlacklist?: boolean;
	whitelistKeys?: TRPCKey | TRPCKey[];
	blacklistKeys?: TRPCKey | TRPCKey[];
	skipCache?: boolean;
	skipQueries?: boolean;
};

const DEFAULT_BLACKLIST_KEYS: TRPCKey[] = [
	"account.get",
	"currency.getList",
	"debtIntentions.getAll",
	"accountConnectionIntentions.getAll",
];

const emptyKeysLists = { whitelistKeys: [], blacklistKeys: [] };

type QueriesFixtures = {
	snapshotQueries: <T>(
		fn: () => Promise<T>,
		options?: Partial<SnapshotQueryCacheOptions>,
	) => Promise<{
		result: T;
		actions: ReturnType<ApiManager["getActions"]>;
		prevQueryCache: Awaited<ReturnType<typeof getDehydratedCache>>;
		nextQueryCache: Awaited<ReturnType<typeof getDehydratedCache>>;
		diff: object;
	}>;
	autoReportQueries: void;
};

type QueriesWorkerFixtures = {
	snapshotIndexTracker: {
		getById: (id: string) => number;
		increment: (id: string) => void;
	};
};

export const queriesFixtures = test.extend<
	QueriesFixtures,
	QueriesWorkerFixtures
>({
	snapshotIndexTracker: [
		async ({}, use) => {
			const indices: Partial<Record<string, number>> = {};
			await use({
				getById: (id) => indices[id] ?? 0,
				increment: (id) => {
					indices[id] ??= 0;
					indices[id] += 1;
				},
			});
		},
		{ auto: true, scope: "worker" },
	],
	snapshotQueries: async (
		{ page, api, snapshotIndexTracker },
		use,
		testInfo,
	) => {
		await use(
			async (
				fn,
				{
					blacklistKeys = [],
					whitelistKeys = [],
					addDefaultBlacklist = true,
					name,
					timeout,
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
				const prevQueryCache = await getDehydratedCache({
					page,
					keysLists,
					timeout,
				});
				const result = await fn();
				const nextQueryCache = await getDehydratedCache({
					page,
					keysLists,
					timeout,
				});
				const diff = getDiff(prevQueryCache, nextQueryCache);
				const actions = api.getActions();
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
							getSnapshotName({
								testInfo,
								key: "cache",
								name: name || snapshotIndexTracker.getById(testInfo.testId),
							}),
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
							getSnapshotName({
								testInfo,
								key: "queries",
								name: name || snapshotIndexTracker.getById(testInfo.testId),
							}),
						);
				}
				if (!name && !(skipQueries && skipCache)) {
					snapshotIndexTracker.increment(testInfo.testId);
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
	autoReportQueries: [
		async ({ page, api }, use, testInfo) => {
			await use();
			if (testInfo.status !== testInfo.expectedStatus) {
				await addAttachment(
					testInfo,
					"dehydrated-cache",
					await getDehydratedCache({
						page,
						timeout: 5000,
						keysLists: emptyKeysLists,
					}),
				);
				const actions = api.getActions();
				await addAttachment(
					testInfo,
					"actions",
					remapActions(actions, emptyKeysLists),
				);
			}
		},
		{ auto: true },
	],
});
