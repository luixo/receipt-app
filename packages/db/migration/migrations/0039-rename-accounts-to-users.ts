import { sql } from "kysely";

import type { Database } from "~db/database";
import {
	DEBTS,
	DEBTS_SYNC_INTENTIONS,
	FUNCTIONS,
	PEERS,
	RECEIPTS,
	RESET_PASSWORD_INTENTIONS,
	SESSIONS,
	USERS,
	USER_SETTINGS,
} from "~db/migration/consts";

const dropOldIndexesTriggers = async (db: Database) => {
	for (const index of [
		USERS.INDEXES.EMAIL.replace("users", "accounts"),
		SESSIONS.INDEXES.USER_ID.replace("user", "account"),
		RECEIPTS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
		PEERS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
		DEBTS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
		DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
		RESET_PASSWORD_INTENTIONS.INDEXES.USER_ID.replace("user", "account"),
	]) {
		await db.schema.dropIndex(index).execute();
	}

	await sql`
		DROP TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP.replace("users", "accounts"))} ON ${sql.table("accounts")};
		DROP TRIGGER ${sql.id(USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP.replace("user", "account"))} ON ${sql.table("accountSettings")};
	`.execute(db);
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

const createNewIndexesTriggers = async (db: Database) => {
	for (const [table, index, column] of [
		["users", USERS.INDEXES.EMAIL, "email"],
		["sessions", SESSIONS.INDEXES.USER_ID, "userId"],
		["receipts", RECEIPTS.INDEXES.OWNER_USER_ID, "ownerUserId"],
		["peers", PEERS.INDEXES.OWNER_USER_ID, "ownerUserId"],
		["debts", DEBTS.INDEXES.OWNER_USER_ID, "ownerUserId"],
		[
			"debtsSyncIntentions",
			DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_USER_ID,
			"ownerUserId",
		],
		[
			"resetPasswordIntentions",
			RESET_PASSWORD_INTENTIONS.INDEXES.USER_ID,
			"userId",
		],
	] as const) {
		await db.schema.createIndex(index).on(table).column(column).execute();
	}

	await sql`
		CREATE TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP)}
			BEFORE UPDATE ON ${sql.table("users")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
		CREATE TRIGGER ${sql.id(USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP)}
			BEFORE UPDATE ON ${sql.table("userSettings")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const dropNewIndexesTriggers = async (db: Database) => {
	for (const index of [
		USERS.INDEXES.EMAIL,
		SESSIONS.INDEXES.USER_ID,
		RECEIPTS.INDEXES.OWNER_USER_ID,
		PEERS.INDEXES.OWNER_USER_ID,
		DEBTS.INDEXES.OWNER_USER_ID,
		DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_USER_ID,
		RESET_PASSWORD_INTENTIONS.INDEXES.USER_ID,
	]) {
		await db.schema.dropIndex(index).execute();
	}

	await sql`
		DROP TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table("users")};
		DROP TRIGGER ${sql.id(USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table("userSettings")};
	`.execute(db);
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

const createOldIndexesTriggers = async (db: Database) => {
	for (const [table, index, column] of [
		["accounts", USERS.INDEXES.EMAIL.replace("users", "accounts"), "email"],
		[
			"sessions",
			SESSIONS.INDEXES.USER_ID.replace("user", "account"),
			"accountId",
		],
		[
			"receipts",
			RECEIPTS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
			"ownerAccountId",
		],
		[
			"peers",
			PEERS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
			"ownerAccountId",
		],
		[
			"debts",
			DEBTS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
			"ownerAccountId",
		],
		[
			"debtsSyncIntentions",
			DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_USER_ID.replace("User", "Account"),
			"ownerAccountId",
		],
		[
			"resetPasswordIntentions",
			RESET_PASSWORD_INTENTIONS.INDEXES.USER_ID.replace("user", "account"),
			"accountId",
		],
	] as const) {
		await db.schema.createIndex(index).on(table).column(column).execute();
	}

	await sql`
		CREATE TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP.replace("users", "accounts"))}
			BEFORE UPDATE ON ${sql.table("accounts")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
		CREATE TRIGGER ${sql.id(USER_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP.replace("user", "account"))}
			BEFORE UPDATE ON ${sql.table("accountSettings")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

export const up = async (db: Database) => {
	await dropOldIndexesTriggers(db);
	await renameUserSchema(db);
	await createNewIndexesTriggers(db);
};

export const down = async (db: Database) => {
	await dropNewIndexesTriggers(db);
	await restoreAccountSchema(db);
	await createOldIndexesTriggers(db);
};
