import { sql } from "kysely";

import type { Database } from "~db/database";
import {
	CURRENT_TIMESTAMP,
	FUNCTIONS,
	RECEIPT_ITEM_PAYERS,
} from "~db/migration/consts";

const createItemPayersTable = async (db: Database) => {
	await db.schema
		.createTable(RECEIPT_ITEM_PAYERS.TABLE_NAME)
		.ifNotExists()
		.addColumn("itemId", "uuid", (cb) =>
			cb
				.notNull()
				.references("receiptItems.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("part", "numeric(5, 2)", (cb) => cb.notNull())
		.addColumn("userId", "uuid", (cb) =>
			cb
				.notNull()
				.references("users.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("createdAt", "timestamptz", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamptz", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addPrimaryKeyConstraint(
			RECEIPT_ITEM_PAYERS.CONSTRAINTS.ITEM_ID_USER_ID_PAIR,
			["itemId", "userId"],
		)
		.execute();
	await db.schema
		.createIndex(RECEIPT_ITEM_PAYERS.INDEXES.ITEM_ID)
		.on(RECEIPT_ITEM_PAYERS.TABLE_NAME)
		.column("itemId")
		.execute();

	await sql`
		CREATE TRIGGER ${sql.id(RECEIPT_ITEM_PAYERS.TRIGGERS.UPDATE_TIMESTAMP)}
			BEFORE UPDATE ON ${sql.table(RECEIPT_ITEM_PAYERS.TABLE_NAME)}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
		`.execute(db);
};

const dropItemPayersTable = async (db: Database) => {
	await sql`
	DROP TRIGGER ${sql.id(
		RECEIPT_ITEM_PAYERS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table(RECEIPT_ITEM_PAYERS.TABLE_NAME)};`.execute(db);
	await db.schema.dropIndex(RECEIPT_ITEM_PAYERS.INDEXES.ITEM_ID).execute();
	await db.schema
		.dropTable(RECEIPT_ITEM_PAYERS.TABLE_NAME)
		.ifExists()
		.execute();
};

export const up = async (db: Database) => {
	await createItemPayersTable(db);
};

export const down = async (db: Database) => {
	await dropItemPayersTable(db);
};
