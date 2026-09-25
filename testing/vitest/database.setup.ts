// oxlint-disable vitest/require-top-level-describe
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import * as timekeeper from "timekeeper";
import { beforeAll, beforeEach, inject } from "vitest";

import { getDatabase } from "~db/database";
import { freezeTemporal } from "~tests/utils/temporal-freeze";
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
	// oxlint-disable-next-line no-empty-pattern
	async ({}, fileOrSuite) => {
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
		const connectionString = makeConnectionString(connectionData, databaseName);
		const database = getDatabase({
			logger,
			connectionString,
		});
		if (filepath) {
			// Metadata is not serializable though `file` reference stays on the run
			// see https://vitest.dev/advanced/metadata
			const file = fileOrSuite as Writeable<typeof fileOrSuite>;
			file.fileContext = {
				logger,
				database: {
					instance: database,
					connectionString,
					dump: () => client.dumpDatabase.mutate({ databaseName }),
					truncate: () => client.truncateDatabase.mutate({ databaseName }),
				},
			};
		}
		return async () => {
			const { getAuthDatabase } = await import("~web/auth/database");
			const authDatabase = getAuthDatabase(connectionString);
			await authDatabase.deleteFrom("auth.session").execute();
			await authDatabase.deleteFrom("auth.account").execute();
			await authDatabase.deleteFrom("auth.user").execute();
			await authDatabase.deleteFrom("auth.verification").execute();
			const { destroyAuthDatabase } = await import("~web/auth/database");
			await destroyAuthDatabase(connectionString);
			await database.destroy();
			await client.releaseDatabase.mutate({ databaseName });
		};
	},
	Temporal.Duration.from({ seconds: 10 }).total("milliseconds"),
);

beforeEach(({ task }) => {
	// oxlint-disable-next-line eslint-js/no-restricted-syntax
	timekeeper.freeze(new Date("2020-01-01"));
	freezeTemporal(Temporal.PlainDateTime.from("2020-01-01T00:00:00"));
	return async () => {
		timekeeper.reset();
		if (task.file.fileContext.database) {
			await task.file.fileContext.database.truncate();
		}
	};
});
