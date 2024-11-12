import type { Database } from "~db/types";

const addReceiptTransferIntentionAccountId = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.addColumn("transferIntentionAccountId", "uuid", (cb) =>
			cb.references("accounts.id").onUpdate("cascade").onDelete("cascade"),
		)
		.execute();
};

const removeReceiptTransferIntentionAccountId = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.dropColumn("transferIntentionAccountId")
		.execute();
};

export const up = async (db: Database) => {
	await removeReceiptTransferIntentionAccountId(db);
};

export const down = async (db: Database) => {
	await addReceiptTransferIntentionAccountId(db);
};
