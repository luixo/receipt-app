import type { Database } from "~db/database";
import { CURRENT_TIMESTAMP } from "~db/migration/consts";

const addReceiptItemCreatedTimestamp = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.addColumn("created", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
};

const removeReceiptItemCreatedTimestamp = async (db: Database) => {
	await db.schema.alterTable("receiptItems").dropColumn("created").execute();
};

export const up = async (db: Database) => {
	await addReceiptItemCreatedTimestamp(db);
};

export const down = async (db: Database) => {
	await removeReceiptItemCreatedTimestamp(db);
};
