import { faker } from "@faker-js/faker";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { Kysely } from "kysely";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import * as timekeeper from "timekeeper";
import type { ResolvedConfig } from "vitest";
import { beforeAll, beforeEach, expect } from "vitest";

import { SECOND } from "app/utils/time";
import { getDatabase } from "next-app/db";
import type { ReceiptsDatabase } from "next-app/db/types";
import { baseLogger } from "next-app/utils/logger";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";

process.env.DATABASE_URL = "unknown";
process.env.REDIS_DATABASE_URL = "unknown";
process.env.REDIS_DATABASE_TOKEN = "unknown";
// Url included in emails
process.env.BASE_URL = "http://receipt-app.test/";

// See https://github.com/vitest-dev/vitest/issues/4025
// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
const config = (globalThis as any).__vitest_worker__.config as ResolvedConfig;
const { port, hostname } = config.environmentOptions.routerConfig;
const client = createTRPCProxyClient<typeof appRouter>({
	links: [httpBatchLink({ url: `http://${hostname}:${port}` })],
});

declare global {
	// eslint-disable-next-line vars-on-top, no-var
	var testContext:
		| {
				database: Kysely<ReceiptsDatabase>;
				dumpDatabase: () => Promise<string>;
				databaseName: string;
				// Fixed random data for tests
				random: {
					getUuid: () => string;
				};
		  }
		| undefined;
}

const HASH_MAGNITUDE = 10 ** 30;

const setSeed = (input: string) => {
	faker.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};

const unsetSeed = () => {
	faker.seed();
};

beforeAll(async () => {
	const { databaseName, connectionData } = await client.lockDatabase.mutate();
	setSeed(expect.getState().testPath || "unkown");
	const database = getDatabase({
		logger: baseLogger,
		pool: new Pool({
			connectionString: makeConnectionString(connectionData, databaseName),
		}),
	});
	global.testContext = {
		database,
		dumpDatabase: () => client.dumpDatabase.mutate({ databaseName }),
		databaseName,
		random: {
			getUuid: () => faker.string.uuid(),
		},
	};
	unsetSeed();
	return async () => {
		await database.destroy();
		await client.releaseDatabase.mutate({ databaseName });
	};
}, 10 * SECOND);

beforeEach(async () => {
	setSeed(expect.getState().currentTestName || "unknown");
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		unsetSeed();
		const { databaseName } = global.testContext!;
		await client.truncateDatabase.mutate({ databaseName });
	};
});
