import type { Database } from "~db";
import { DEBTS } from "~db";

const addReceiptIdColumn = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.addColumn("receiptId", "uuid", (cb) =>
			cb.references("receipts.id").onUpdate("cascade").onDelete("cascade"),
		)
		.execute();
};

const addReceiptIdConstraint = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.addUniqueConstraint(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE, [
			"ownerAccountId",
			"receiptId",
			"userId",
		])
		.execute();
};

const removeReceiptIdColumn = async (db: Database) => {
	await db.schema.alterTable("debts").dropColumn("receiptId").execute();
};

const removeReceiptIdConstraint = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.dropConstraint(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)
		.execute();
};

export const up = async (db: Database) => {
	await addReceiptIdColumn(db);
	await addReceiptIdConstraint(db);
};

export const down = async (db: Database) => {
	await removeReceiptIdConstraint(db);
	await removeReceiptIdColumn(db);
};
