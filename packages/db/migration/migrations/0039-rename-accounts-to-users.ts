import { sql } from "kysely";

import type { Database } from "~db/database";
import {
	DEBTS,
	PEERS,
	RECEIPTS,
	RESET_PASSWORD_INTENTIONS,
	SESSIONS,
	USERS,
	USER_SETTINGS,
} from "~db/migration/consts";

const indexes = [
	USERS.INDEXES.EMAIL,
	SESSIONS.INDEXES.USER_ID,
	RECEIPTS.INDEXES.OWNER_USER_ID,
	PEERS.INDEXES.OWNER_USER_ID,
	DEBTS.INDEXES.OWNER_USER_ID,
	RESET_PASSWORD_INTENTIONS.INDEXES.USER_ID,
] as const;

const renameIndexes = async (db: Database, reverse = false) => {
	for (const newName of indexes) {
		const oldName = newName
			.replace("users", "accounts")
			.replace("user", "account")
			.replace("User", "Account");
		const [from, to] = reverse ? [newName, oldName] : [oldName, newName];
		await sql`ALTER INDEX ${sql.id(from)} RENAME TO ${sql.id(to)}`.execute(db);
	}
};

const renameTriggers = async (db: Database, reverse = false) => {
	const triggers = [
		[
			USERS.TRIGGERS.UPDATE_TIMESTAMP,
			USERS.TRIGGERS.UPDATE_TIMESTAMP.replace("users", "accounts"),
			"accounts",
			"users",
		],
		[
			USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP,
			USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP.replace("user", "account"),
			"accountSettings",
			"userSettings",
		],
	] as const;
	for (const [newName, oldName, oldTable, newTable] of triggers) {
		const [from, to, table] = reverse
			? [newName, oldName, newTable]
			: [oldName, newName, oldTable];
		await sql`
			ALTER TRIGGER ${sql.id(from)} ON ${sql.table(table)}
			RENAME TO ${sql.id(to)};
		`.execute(db);
	}
};

const renameUserSchema = async (db: Database) => {
	await db.schema.alterTable("accounts").renameTo("users").execute();
	await db.schema
		.alterTable("accountSettings")
		.renameTo("userSettings")
		.execute();

	for (const [table, from, to] of [
		["sessions", "accountId", "userId"],
		["receipts", "ownerAccountId", "ownerUserId"],
		["peers", "ownerAccountId", "ownerUserId"],
		["peers", "connectedAccountId", "connectedUserId"],
		["debts", "ownerAccountId", "ownerUserId"],
		["resetPasswordIntentions", "accountId", "userId"],
		["userSettings", "accountId", "userId"],
	] as const) {
		await db.schema.alterTable(table).renameColumn(from, to).execute();
	}
};

const restoreAccountSchema = async (db: Database) => {
	await db.schema
		.alterTable("userSettings")
		.renameTo("accountSettings")
		.execute();
	await db.schema.alterTable("users").renameTo("accounts").execute();

	for (const [table, from, to] of [
		["sessions", "userId", "accountId"],
		["receipts", "ownerUserId", "ownerAccountId"],
		["peers", "ownerUserId", "ownerAccountId"],
		["peers", "connectedUserId", "connectedAccountId"],
		["debts", "ownerUserId", "ownerAccountId"],
		["resetPasswordIntentions", "userId", "accountId"],
		["accountSettings", "userId", "accountId"],
	] as const) {
		await db.schema.alterTable(table).renameColumn(from, to).execute();
	}
};

export const up = async (db: Database) => {
	await renameIndexes(db);
	await renameTriggers(db);
	await renameUserSchema(db);
};

export const down = async (db: Database) => {
	await renameTriggers(db, true);
	await restoreAccountSchema(db);
	await renameIndexes(db, true);
};
