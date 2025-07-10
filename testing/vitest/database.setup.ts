import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import * as timekeeper from "timekeeper";
import { beforeAll, beforeEach, inject } from "vitest";

import { getDatabase } from "~db/database";
import { serializeDuration } from "~utils/date";
import { transformer } from "~utils/transformer";
import type { Writeable } from "~utils/types";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";
import { getLogger } from "./utils/mocks/logger";

const { port } = inject("routerConfig");
const client = createTRPCClient<typeof appRouter>({
	links: [
		httpBatchStreamLink({ url: `http://localhost:${port}`, transformer }),
	],
});

const databaseIgnoredFiles = [/api\/trpc/];

beforeAll(
	async (fileOrSuite) => {
		const logger = getLogger();
		const filepath =
			"filepath" in fileOrSuite ? fileOrSuite.filepath : undefined;
		if (
			filepath &&
			databaseIgnoredFiles.some((regexp) => regexp.test(filepath))
		) {
			const file = fileOrSuite as Writeable<typeof fileOrSuite>;
			file.fileContext = { logger };
			return;
		}
		const { databaseName, connectionData } = await client.lockDatabase.mutate();
		const database = getDatabase({
			logger,
			connectionString: makeConnectionString(connectionData, databaseName),
		});
		if (filepath) {
			// Metadata is not serializable though `file` reference stays on the run
			// see https://vitest.dev/advanced/metadata
			const file = fileOrSuite as Writeable<typeof fileOrSuite>;
			file.fileContext = {
				logger,
				database: {
					instance: database,
					dump: () => client.dumpDatabase.mutate({ databaseName }),
					truncate: () => client.truncateDatabase.mutate({ databaseName }),
				},
			};
		}
		return async () => {
			await database.destroy();
			await client.releaseDatabase.mutate({ databaseName });
		};
	},
	serializeDuration({ seconds: 10 }),
);

beforeEach(async ({ task }) => {
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		if (task.file.fileContext.database) {
			await task.file.fileContext.database.truncate();
		}
	};
});
