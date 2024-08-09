import {
	createTRPCClient,
	unstable_httpBatchStreamLink as httpBatchStreamLink,
} from "@trpc/client";
import { Pool } from "pg";
import * as timekeeper from "timekeeper";
import { beforeAll, beforeEach, inject } from "vitest";

import { getDatabase } from "~db";
import type { Writeable } from "~utils";
import { SECOND } from "~utils";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";
import { getLogger } from "./utils/mocks/logger";

const { port } = inject("routerConfig");
const client = createTRPCClient<typeof appRouter>({
	links: [httpBatchStreamLink({ url: `http://localhost:${port}` })],
});

beforeAll(async (fileOrSuite) => {
	const { databaseName, connectionData } = await client.lockDatabase.mutate();
	const logger = getLogger();
	const database = getDatabase({
		logger,
		pool: new Pool({
			connectionString: makeConnectionString(connectionData, databaseName),
		}),
	});
	if ("filepath" in fileOrSuite) {
		// Metadata is not serializable though `file` reference stays on the run
		// see https://vitest.dev/advanced/metadata
		const file = fileOrSuite as Writeable<typeof fileOrSuite>;
		file.fileContext = {
			logger,
			database,
			dumpDatabase: () => client.dumpDatabase.mutate({ databaseName }),
			truncateDatabase: () => client.truncateDatabase.mutate({ databaseName }),
		};
	}
	return async () => {
		await database.destroy();
		await client.releaseDatabase.mutate({ databaseName });
	};
}, 10 * SECOND);

beforeEach(async ({ task }) => {
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		await task.file.fileContext.truncateDatabase();
	};
});
