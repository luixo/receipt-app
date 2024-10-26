import { CURRENT_TIMESTAMP } from "~db/consts";
import type { Database } from "~db/types";

const removeReceiptCreatedAtDefault = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.alterColumn("createdAt", (cb) => cb.dropDefault())
		.execute();
};

const addReceiptCreatedAtDefault = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.alterColumn("createdAt", (cb) => cb.setDefault(CURRENT_TIMESTAMP))
		.execute();
};

export const up = async (db: Database) => {
	await addReceiptCreatedAtDefault(db);
};

export const down = async (db: Database) => {
	await removeReceiptCreatedAtDefault(db);
};
