import { sql } from "kysely";

import {
	FUNCTIONS,
	ITEM_PARTICIPANTS_DEPRECATED,
	RECEIPT_ITEM_CONSUMERS,
} from "~db/migration/consts";
import type { Database } from "~db/types";

const dropOldIndexes = async (db: Database) => {
	await db.schema
		.dropIndex(ITEM_PARTICIPANTS_DEPRECATED.INDEXES.ITEM_ID)
		.execute();
	await sql`
	DROP TRIGGER ${sql.id(
		ITEM_PARTICIPANTS_DEPRECATED.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("itemParticipants")};`.execute(db);
};

const renameItemParticipantsToItemConsumers = async (db: Database) => {
	await db.schema
		.alterTable("itemParticipants")
		.renameTo("receiptItemConsumers")
		.execute();
};

const renameConstraintUp = async (db: Database) => {
	await sql
		.raw(
			`ALTER TABLE "itemParticipants" RENAME CONSTRAINT "${ITEM_PARTICIPANTS_DEPRECATED.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}" TO "${RECEIPT_ITEM_CONSUMERS.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}"`,
		)
		.execute(db);
};

const createNewIndexes = async (db: Database) => {
	await db.schema
		.createIndex(RECEIPT_ITEM_CONSUMERS.INDEXES.ITEM_ID)
		.on("receiptItemConsumers")
		.column("itemId")
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(RECEIPT_ITEM_CONSUMERS.TRIGGERS.UPDATE_TIMESTAMP)}
		BEFORE UPDATE ON ${sql.table("receiptItemConsumers")}
		FOR EACH ROW
		EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const dropNewIndexes = async (db: Database) => {
	await db.schema.dropIndex(RECEIPT_ITEM_CONSUMERS.INDEXES.ITEM_ID).execute();
	await sql`
	DROP TRIGGER ${sql.id(
		RECEIPT_ITEM_CONSUMERS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("receiptItemConsumers")};`.execute(db);
};

const renameItemConsumersToItemParticipants = async (db: Database) => {
	await db.schema
		.alterTable("receiptItemConsumers")
		.renameTo("itemParticipants")
		.execute();
};

const renameConstraintDown = async (db: Database) => {
	await sql
		.raw(
			`ALTER TABLE "receiptItemConsumers" RENAME CONSTRAINT "${RECEIPT_ITEM_CONSUMERS.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}" TO "${ITEM_PARTICIPANTS_DEPRECATED.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}"`,
		)
		.execute(db);
};

const createOldIndexes = async (db: Database) => {
	await db.schema
		.createIndex(ITEM_PARTICIPANTS_DEPRECATED.INDEXES.ITEM_ID)
		.on("itemParticipants")
		.column("itemId")
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(ITEM_PARTICIPANTS_DEPRECATED.TRIGGERS.UPDATE_TIMESTAMP)}
		BEFORE UPDATE ON ${sql.table("itemParticipants")}
		FOR EACH ROW
		EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

export const up = async (db: Database) => {
	await dropOldIndexes(db);
	await renameConstraintUp(db);
	await renameItemParticipantsToItemConsumers(db);
	await createNewIndexes(db);
};

export const down = async (db: Database) => {
	await dropNewIndexes(db);
	await renameConstraintDown(db);
	await renameItemConsumersToItemParticipants(db);
	await createOldIndexes(db);
};
