import { faker } from "@faker-js/faker";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { Kysely } from "kysely";
import { createHash } from "node:crypto";
import { Pool } from "pg";

import { getDatabase } from "next-app/db";
import type { ReceiptsDatabase } from "next-app/db/types";
import type { Email } from "next-app/utils/email";
import { baseLogger } from "next-app/utils/logger";

import { makeConnectionString } from "./databases/connection";
import type { appRouter } from "./databases/router";

process.env.DATABASE_URL = "unknown";
process.env.REDIS_DATABASE_URL = "unknown";
process.env.REDIS_DATABASE_TOKEN = "unknown";
// Url included in emails
process.env.BASE_URL = "http://receipt-app.test/";

const { port, hostname } = globalThis.routerConfig;
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
				emailService: {
					active: boolean;
					broke: boolean;
					messages: Email[];
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
	const { databaseName, connectionData } = await client.lockDatabase.query();
	setSeed(expect.getState().testPath || "unkown");
	global.testContext = {
		database: getDatabase({
			logger: baseLogger,
			pool: new Pool({
				connectionString: makeConnectionString(connectionData, databaseName),
			}),
		}),
		dumpDatabase: () => client.dumpDatabase.query({ databaseName }),
		databaseName,
		random: {
			getUuid: () => faker.string.uuid(),
		},
		emailService: {
			active: true,
			broke: false,
			messages: [],
		},
	};
	unsetSeed();
});

beforeEach(async () => {
	setSeed(expect.getState().currentTestName || "unknown");
});

afterEach(async () => {
	unsetSeed();
	const { databaseName } = global.testContext!;
	global.testContext!.emailService = {
		active: true,
		broke: false,
		messages: [],
	};
	await client.truncateDatabase.mutate({ databaseName });
});

afterAll(async () => {
	const { databaseName, database } = global.testContext!;
	await database.destroy();
	await client.releaseDatabase.mutate({ databaseName });
});
