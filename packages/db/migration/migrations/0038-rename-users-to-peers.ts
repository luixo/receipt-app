import { sql } from "kysely";

import type { Database } from "~db/database";
import {
	DEBTS,
	FUNCTIONS,
	PEERS,
	RECEIPT_PARTICIPANTS,
} from "~db/migration/consts";

const dropOldIndexesTriggers = async (db: Database) => {
	for (const index of [
		PEERS.INDEXES.OWNER_ACCOUNT_ID.replace("peer", "user"),
		DEBTS.INDEXES.USER_ID.replace("peer", "user"),
		RECEIPT_PARTICIPANTS.INDEXES.USER_ID.replace("peer", "user"),
	]) {
		await db.schema.dropIndex(index).execute();
	}

	await sql`
		DROP TRIGGER IF EXISTS ${sql.id(PEERS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table("users")};
		DROP TRIGGER IF EXISTS ${sql.id(PEERS.TRIGGERS.UPDATE_TIMESTAMP.replace("peer", "user"))} ON ${sql.table("users")};
	`.execute(db);
};

const renamePeerSchema = async (db: Database) => {
	await db.schema.alterTable("users").renameTo("peers").execute();
	for (const table of [
		"debts",
		"receiptParticipants",
		"receiptItemConsumers",
		"receiptItemPayers",
	]) {
		await db.schema
			.alterTable(table)
			.renameColumn("userId", "peerId")
			.execute();
	}
};

const createNewIndexesTriggers = async (db: Database) => {
	await db.schema
		.createIndex(PEERS.INDEXES.OWNER_ACCOUNT_ID)
		.on("peers")
		.column("ownerAccountId")
		.execute();
	await db.schema
		.createIndex(DEBTS.INDEXES.USER_ID)
		.on("debts")
		.column("peerId")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS.INDEXES.USER_ID)
		.on("receiptParticipants")
		.column("peerId")
		.execute();
	await sql`
		CREATE TRIGGER ${sql.id(PEERS.TRIGGERS.UPDATE_TIMESTAMP)}
			BEFORE UPDATE ON ${sql.table("peers")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const dropNewIndexesTriggers = async (db: Database) => {
	await db.schema.dropIndex(PEERS.INDEXES.OWNER_ACCOUNT_ID).execute();
	await db.schema.dropIndex(DEBTS.INDEXES.USER_ID).execute();
	await db.schema.dropIndex(RECEIPT_PARTICIPANTS.INDEXES.USER_ID).execute();
	await sql`
		DROP TRIGGER ${sql.id(PEERS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table("peers")};
	`.execute(db);
};

const restoreUserSchema = async (db: Database) => {
	await db.schema.alterTable("peers").renameTo("users").execute();
	for (const table of [
		"debts",
		"receiptParticipants",
		"receiptItemConsumers",
		"receiptItemPayers",
	]) {
		await db.schema
			.alterTable(table)
			.renameColumn("peerId", "userId")
			.execute();
	}
};

const createOldIndexesTriggers = async (db: Database) => {
	await db.schema
		.createIndex(PEERS.INDEXES.OWNER_ACCOUNT_ID)
		.on("users")
		.column("ownerAccountId")
		.execute();
	await db.schema
		.createIndex(DEBTS.INDEXES.USER_ID)
		.on("debts")
		.column("userId")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS.INDEXES.USER_ID)
		.on("receiptParticipants")
		.column("userId")
		.execute();
	await sql`
		CREATE TRIGGER ${sql.id(PEERS.TRIGGERS.UPDATE_TIMESTAMP)}
			BEFORE UPDATE ON ${sql.table("users")}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

export const up = async (db: Database) => {
	await dropOldIndexesTriggers(db);
	await renamePeerSchema(db);
	await createNewIndexesTriggers(db);
};

export const down = async (db: Database) => {
	await dropNewIndexesTriggers(db);
	await restoreUserSchema(db);
	await createOldIndexesTriggers(db);
};
