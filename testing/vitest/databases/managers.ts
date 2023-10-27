import { Kysely, PostgresDialect, sql } from "kysely";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

import type { ConnectionData } from "./connection";
import { makeConnectionString } from "./connection";

type TemplateDatabaseListener<T> = () => Promise<T>;
export const templateDatabaseManagerFactory = () => {
	const listeners: TemplateDatabaseListener<unknown>[] = [];
	const release = async () => {
		const topListener = listeners[0];
		if (topListener) {
			await topListener();
			listeners.shift();
			void release();
		}
	};
	return {
		waitForDatabase: <T>(listener: TemplateDatabaseListener<T>) =>
			new Promise<T>((resolve) => {
				const promisifiedListener = async () => {
					const result = await listener();
					resolve(result);
				};
				listeners.push(promisifiedListener);
				if (listeners.length === 1) {
					void release();
				}
			}),
	};
};

export type DatabaseInstance = { name: string; locked: boolean };
type DatabaseListener = (database: DatabaseInstance) => void;
export const databaseManagerFactory = (
	maxDatabases: number,
	connectionData: ConnectionData,
	templateDatabaseName: string,
	cleanupManager: ReturnType<typeof cleanupManagerFactory>,
) => {
	const databases: DatabaseInstance[] = [];
	const listeners: DatabaseListener[] = [];
	const getByName = (lookupName: string) => {
		const database = databases.find(({ name }) => name === lookupName);
		if (!database) {
			throw new Error(`Expected to have database with name ${lookupName}`);
		}
		return database;
	};
	const release = (databaseName: string) => {
		const database = getByName(databaseName);
		database.locked = false;
		const topListener = listeners.shift();
		if (topListener) {
			database.locked = true;
			topListener(database);
		}
	};
	const templateDatabaseManager = templateDatabaseManagerFactory();
	return {
		getFirstUnlocked: () => databases.find((schema) => !schema.locked),
		maybeCreateDatabase: async () => {
			if (databases.length >= maxDatabases) {
				return;
			}
			return templateDatabaseManager.waitForDatabase(async () => {
				const name = `public-${randomUUID()}`;
				const database = new Kysely({
					dialect: new PostgresDialect({
						pool: new Pool({
							connectionString: makeConnectionString(
								connectionData,
								templateDatabaseName,
							),
						}),
					}),
				});
				await cleanupManager.withCleanup(
					() => database.destroy(),
					async () => {
						await sql`CREATE DATABASE ${sql.id(name)} TEMPLATE ${sql.id(
							templateDatabaseName,
						)}`.execute(database);
					},
				);
				databases.push({ name, locked: false });
				release(name);
				return name;
			});
		},
		release,
		waitForDatabase: () =>
			new Promise<DatabaseInstance>((resolve) => {
				listeners.push(resolve);
			}),
	};
};

type CleanupFn = () => Promise<void>;
export const cleanupManagerFactory = () => {
	let cleanupFns: CleanupFn[] = [];
	return {
		withCleanup: async (
			cleanupFn: CleanupFn,
			actualFn: () => Promise<void>,
		) => {
			cleanupFns.push(cleanupFn);
			await actualFn();
			cleanupFns = cleanupFns.filter((lookupFn) => lookupFn !== cleanupFn);
			await cleanupFn();
		},
		cleanup: async () => {
			await Promise.all(cleanupFns.map((fn) => fn()));
		},
	};
};
