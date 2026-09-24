import { sql } from "kysely";

import type { Database } from "~db/database";

const columns = [
	["sessions", "accountId", "userId"],
	["receipts", "ownerAccountId", "ownerUserId"],
	["peers", "ownerAccountId", "ownerUserId"],
	["peers", "connectedAccountId", "connectedUserId"],
	["debts", "ownerAccountId", "ownerUserId"],
	["resetPasswordIntentions", "accountId", "userId"],
	["userSettings", "accountId", "userId"],
] as const;

const indexes = [
	["accounts:email:index", "users:email:index"],
	["sessions:accountId:index", "sessions:userId:index"],
	["receipts:ownerAccountId:index", "receipts:ownerUserId:index"],
	["peers:ownerAccountId:index", "peers:ownerUserId:index"],
	["debts:ownerAccountId:index", "debts:ownerUserId:index"],
	[
		"debtsSyncIntentions:ownerAccountId:index",
		"debtsSyncIntentions:ownerUserId:index",
	],
	[
		"resetPasswordIntentions:accountId:index",
		"resetPasswordIntentions:userId:index",
	],
] as const;

export const up = async (db: Database) => {
	await db.schema.alterTable("accounts").renameTo("users").execute();
	await db.schema
		.alterTable("accountSettings")
		.renameTo("userSettings")
		.execute();
	await sql`
		ALTER TRIGGER ${sql.id("accounts:updateTimestamp")} ON ${sql.table("users")}
		RENAME TO ${sql.id("users:updateTimestamp")};
		ALTER TRIGGER ${sql.id("accountSettings:updateTimestamp")} ON ${sql.table("userSettings")}
		RENAME TO ${sql.id("userSettings:updateTimestamp")};
	`.execute(db);
	for (const [table, from, to] of columns) {
		await db.schema.alterTable(table).renameColumn(from, to).execute();
	}
	for (const [from, to] of indexes) {
		await sql`ALTER INDEX IF EXISTS ${sql.id(from)} RENAME TO ${sql.id(to)}`.execute(
			db,
		);
	}
};

export const down = async (db: Database) => {
	for (const [from, to] of [...indexes].toReversed()) {
		await sql`ALTER INDEX IF EXISTS ${sql.id(to)} RENAME TO ${sql.id(from)}`.execute(
			db,
		);
	}
	for (const [table, from, to] of [...columns].toReversed()) {
		await db.schema.alterTable(table).renameColumn(to, from).execute();
	}
	await sql`
		ALTER TRIGGER ${sql.id("users:updateTimestamp")} ON ${sql.table("users")}
		RENAME TO ${sql.id("accounts:updateTimestamp")};
		ALTER TRIGGER ${sql.id("userSettings:updateTimestamp")} ON ${sql.table("userSettings")}
		RENAME TO ${sql.id("accountSettings:updateTimestamp")};
	`.execute(db);
	await db.schema
		.alterTable("userSettings")
		.renameTo("accountSettings")
		.execute();
	await db.schema.alterTable("users").renameTo("accounts").execute();
};
