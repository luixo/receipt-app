import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { Pool } from "pg";
import * as timekeeper from "timekeeper";
import type { Suite as OriginalSuite, ResolvedConfig } from "vitest";
import { beforeAll, beforeEach } from "vitest";

import { SECOND } from "app/utils/time";
import { getDatabase } from "next-app/db";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";
import { getLogger } from "./utils/mocks/logger";

// See https://github.com/vitest-dev/vitest/issues/4025
// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
const config = (globalThis as any).__vitest_worker__.config as ResolvedConfig;
const { port, hostname } = config.environmentOptions.routerConfig;
const client = createTRPCProxyClient<typeof appRouter>({
	links: [httpBatchLink({ url: `http://${hostname}:${port}` })],
});

beforeAll(async (suite) => {
	const { databaseName, connectionData } = await client.lockDatabase.mutate();
	const logger = getLogger();
	const database = getDatabase({
		logger,
		pool: new Pool({
			connectionString: makeConnectionString(connectionData, databaseName),
		}),
	});
	let totalDiffTime = 0;
	(suite as OriginalSuite).suiteContext = {
		logger,
		database,
		dumpDatabase: () => client.dumpDatabase.mutate({ databaseName }),
		truncateDatabase: () => client.truncateDatabase.mutate({ databaseName }),
		logDiffTime: (time) => (totalDiffTime += time),
	};
	return async () => {
		await database.destroy();
		await client.releaseDatabase.mutate({ databaseName });
		await client.logDiffTime.mutate({ diffTime: totalDiffTime });
	};
}, 10 * SECOND);

beforeEach(async ({ task }) => {
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		await task.suite.file!.suiteContext.truncateDatabase();
	};
});
