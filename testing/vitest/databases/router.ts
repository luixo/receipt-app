import { initTRPC } from "@trpc/server";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { StartedTestContainer } from "testcontainers";
import { GenericContainer } from "testcontainers";
import { z } from "zod";

import { getDatabase } from "~db";
import type { ReceiptsDatabase } from "~db";
import { migrate } from "~db/migration/index";

import type { ConnectionData } from "./connection";
import { makeConnectionString } from "./connection";
import { cleanupManagerFactory, databaseManagerFactory } from "./managers";

const POSTGRES_USER = "test-user";
const POSTGRES_PASSWORD = "test-password";
const POSTGRES_HOST = "localhost";
const POSTGRES_PORT = 5432;
const POSTGRES_TEMPLATE_DATABASE = "template-test";
const POSTGRES_TEMP_DIR = "/temp_pgdata";

type OrderBy<DB, TB extends keyof DB> = keyof DB[TB];
const ORDERS: {
	[K in keyof ReceiptsDatabase]:
		| OrderBy<ReceiptsDatabase, K>
		| OrderBy<ReceiptsDatabase, K>[];
} = {
	accountConnectionsIntentions: ["accountId", "targetAccountId"],
	accounts: "id",
	accountSettings: "accountId",
	debts: ["id", "ownerAccountId"],
	itemParticipants: ["itemId", "userId"],
	receiptItems: "id",
	receiptParticipants: ["receiptId", "userId"],
	receipts: "id",
	resetPasswordIntentions: ["accountId", "token"],
	sessions: "sessionId",
	users: "id",
};

const { router, procedure, middleware, createCallerFactory } =
	initTRPC.create();

let runningInstance:
	| {
			container: StartedTestContainer;
			connectionData: ConnectionData;
			cleanupManager: ReturnType<typeof cleanupManagerFactory>;
			databaseManager: ReturnType<typeof databaseManagerFactory>;
	  }
	| undefined;

const runningProcedure = procedure.use(
	middleware(async ({ ctx, path, next }) => {
		if (!runningInstance) {
			throw new Error(`No instance found for ${path}`);
		}
		return next({
			ctx: { ...ctx, instance: runningInstance },
		});
	}),
);

export const appRouter = router({
	setup: procedure
		.input(z.strictObject({ maxDatabases: z.number() }))
		.mutation(async ({ input }) => {
			const container = new GenericContainer("postgres")
				.withTmpFs({ [POSTGRES_TEMP_DIR]: "rw" })
				.withExposedPorts(POSTGRES_PORT)
				.withEnv("POSTGRES_USER", POSTGRES_USER)
				.withEnv("POSTGRES_PASSWORD", POSTGRES_PASSWORD)
				.withEnv("POSTGRES_DB", POSTGRES_TEMPLATE_DATABASE)
				.withEnv("PGDATA", POSTGRES_TEMP_DIR);
			const runningContainer = await container.start();
			const connectionData = {
				host: POSTGRES_HOST,
				username: POSTGRES_USER,
				password: POSTGRES_PASSWORD,
				port: runningContainer.getMappedPort(POSTGRES_PORT),
			};

			const cleanupManager = cleanupManagerFactory();
			const database = getDatabase({
				pool: new Pool({
					connectionString: makeConnectionString(
						connectionData,
						POSTGRES_TEMPLATE_DATABASE,
					),
				}),
			});
			await cleanupManager.withCleanup(
				() => database.destroy(),
				async () => {
					const migrationResult = await migrate({ target: "latest", database });
					await database.destroy();
					if (!migrationResult.ok) {
						throw migrationResult.error;
					}
				},
			);

			runningInstance = {
				container: runningContainer,
				connectionData,
				databaseManager: databaseManagerFactory(
					input.maxDatabases,
					connectionData,
					POSTGRES_TEMPLATE_DATABASE,
					cleanupManager,
				),
				cleanupManager,
			};
		}),
	teardown: runningProcedure.mutation(async ({ ctx: { instance } }) =>
		instance.container.stop({ timeout: 10000 }),
	),
	lockDatabase: runningProcedure
		.output(
			z.strictObject({
				connectionData: z.strictObject({
					host: z.string(),
					port: z.number(),
					username: z.string(),
					password: z.string(),
				}),
				databaseName: z.string(),
			}),
		)
		.mutation(async ({ ctx: { instance } }) => {
			const firstUnlockedDatabase = instance.databaseManager.getFirstUnlocked();
			if (firstUnlockedDatabase) {
				firstUnlockedDatabase.locked = true;
				return {
					databaseName: firstUnlockedDatabase.name,
					connectionData: instance.connectionData,
				};
			}
			void instance.databaseManager.maybeCreateDatabase();
			const { name } = await instance.databaseManager.waitForDatabase();
			return {
				databaseName: name,
				connectionData: instance.connectionData,
			};
		}),
	dumpDatabase: runningProcedure
		.input(z.object({ databaseName: z.string() }))
		.mutation(async ({ input, ctx: { instance } }) => {
			const database = getDatabase({
				pool: new Pool({
					connectionString: makeConnectionString(
						instance.connectionData,
						input.databaseName,
					),
				}),
			});
			const dump = await Promise.all(
				(Object.keys(ORDERS) as (keyof typeof ORDERS)[]).map(
					async (tableName) => {
						const orderOrOrders = ORDERS[tableName];
						const orders = Array.isArray(orderOrOrders)
							? orderOrOrders
							: [orderOrOrders];
						const data = await database
							.selectFrom(tableName)
							.selectAll()
							.execute();
						return {
							tableName,
							data: data.reduce(
								(dataAcc, element) => ({
									...dataAcc,
									[orders
										.map((column) => `${column}:${String(element[column])}`)
										.join("|")]: element,
								}),
								{},
							),
						};
					},
				),
			);
			await database.destroy();
			return dump.reduce(
				(acc, { tableName, data }) => ({ ...acc, [tableName]: data }),
				{},
			);
		}),
	truncateDatabase: runningProcedure
		.input(z.object({ databaseName: z.string() }))
		.mutation(async ({ input, ctx: { instance } }) => {
			const database = new Kysely<ReceiptsDatabase>({
				dialect: new PostgresDialect({
					pool: new Pool({
						connectionString: makeConnectionString(
							instance.connectionData,
							input.databaseName,
						),
					}),
				}),
			});
			await instance.cleanupManager.withCleanup(
				() => database.destroy(),
				async () => {
					await sql`TRUNCATE ${sql.join(
						Object.keys(ORDERS).map((table) => sql.table(table)),
						sql`,`,
					)} RESTART IDENTITY`.execute(database);
				},
			);
		}),
	releaseDatabase: runningProcedure
		.input(z.object({ databaseName: z.string() }))
		.mutation(async ({ input, ctx: { instance } }) => {
			instance.databaseManager.release(input.databaseName);
		}),
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
