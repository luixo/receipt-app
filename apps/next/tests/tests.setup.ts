import { Faker, en, faker } from "@faker-js/faker";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import * as timekeeper from "timekeeper";
import type { Suite as OriginalSuite, ResolvedConfig } from "vitest";
import { beforeAll, beforeEach, expect } from "vitest";

import { SECOND } from "app/utils/time";
import type { Database } from "next-app/db";
import { getDatabase } from "next-app/db";
import { baseLogger } from "next-app/utils/logger";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";

process.env.DATABASE_URL = "unknown";
// Url included in emails
process.env.BASE_URL = "http://receipt-app.test/";

// See https://github.com/vitest-dev/vitest/issues/4025
// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
const config = (globalThis as any).__vitest_worker__.config as ResolvedConfig;
const { port, hostname } = config.environmentOptions.routerConfig;
const client = createTRPCProxyClient<typeof appRouter>({
	links: [httpBatchLink({ url: `http://${hostname}:${port}` })],
});

const HASH_MAGNITUDE = 10 ** 30;

const setSeed = (instance: Faker, input: string) => {
	instance.seed(
		parseInt(createHash("sha1").update(input).digest("hex"), 16) /
			HASH_MAGNITUDE,
	);
};

const createStableFaker = (input: string) => {
	const instance = new Faker({ locale: en });
	setSeed(instance, input);
	return instance;
};

declare module "vitest" {
	interface Suite {
		suiteContext: {
			database: Database;
			dumpDatabase: () => Promise<string>;
			truncateDatabase: () => Promise<void>;
			getUuid: () => string;
			getTestUuid: () => string;
			getSalt: () => string;
			getTestSalt: () => string;
		};
	}
}

beforeAll(async (suite) => {
	const { databaseName, connectionData } = await client.lockDatabase.mutate();
	const database = getDatabase({
		logger: baseLogger,
		pool: new Pool({
			connectionString: makeConnectionString(connectionData, databaseName),
		}),
	});
	const suiteId = expect.getState().testPath || "unkown";
	// Stable faker to generate uuid / salt on handler side
	const handlerIdFaker = createStableFaker(suiteId);
	// Stable faker to generate uuid / salt on tests side
	const testIdFaker = createStableFaker(suiteId);
	(suite as OriginalSuite).suiteContext = {
		database,
		dumpDatabase: () => client.dumpDatabase.mutate({ databaseName }),
		truncateDatabase: () => client.truncateDatabase.mutate({ databaseName }),
		getUuid: () => handlerIdFaker.string.uuid(),
		getSalt: () =>
			handlerIdFaker.string.hexadecimal({
				length: 128,
				casing: "lower",
				prefix: "",
			}),
		getTestUuid: () => testIdFaker.string.uuid(),
		getTestSalt: () =>
			testIdFaker.string.hexadecimal({
				length: 128,
				casing: "lower",
				prefix: "",
			}),
	};
	return async () => {
		await database.destroy();
		await client.releaseDatabase.mutate({ databaseName });
	};
}, 10 * SECOND);

beforeEach(async ({ task }) => {
	setSeed(faker, expect.getState().currentTestName || "unknown");
	timekeeper.freeze(new Date("2020-01-01"));
	return async () => {
		timekeeper.reset();
		faker.seed();
		await task.suite.file!.suiteContext.truncateDatabase();
	};
});
