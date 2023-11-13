import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { Pool } from "pg";
import * as timekeeper from "timekeeper";
import type { Suite as OriginalSuite } from "vitest";
import { beforeAll, beforeEach, inject } from "vitest";

import { SECOND } from "app/utils/time";
import { getDatabase } from "next-app/db";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";
import { getLogger } from "./utils/mocks/logger";

const { port, hostname } = inject("routerConfig");
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
	(suite as OriginalSuite).suiteContext = {
		logger,
		database,
		dumpDatabase: () => client.dumpDatabase.mutate({ databaseName }),
		truncateDatabase: () => client.truncateDatabase.mutate({ databaseName }),
	};
	return async () => {
		await database.destroy();
		await client.releaseDatabase.mutate({ databaseName });
	};
}, 10 * SECOND);

beforeEach(async ({ task }) => {
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		await task.suite.file!.suiteContext.truncateDatabase();
	};
});
