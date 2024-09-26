import type { Database } from "~db/types";

const renameReceiptsCreated = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.renameColumn("created", "createdAt")
		.execute();
};

const renameReceiptItemsCreated = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.renameColumn("created", "createdAt")
		.execute();
};

const renameDebtsCreated = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.renameColumn("created", "createdAt")
		.execute();
};

const renameAccountConnectionsIntentionsCreated = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.renameColumn("created", "createdAt")
		.execute();
};

const renameReceiptParticipantsIntentionsAdded = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.renameColumn("added", "createdAt")
		.execute();
};

const undoRenameReceiptsCreated = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.renameColumn("createdAt", "created")
		.execute();
};

const undoRenameReceiptItemsCreated = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.renameColumn("createdAt", "created")
		.execute();
};

const undoRenameDebtsCreated = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.renameColumn("createdAt", "created")
		.execute();
};

const undoRenameAccountConnectionsIntentionsCreated = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.renameColumn("createdAt", "created")
		.execute();
};

const undoRenameReceiptParticipantsIntentionsAdded = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.renameColumn("createdAt", "added")
		.execute();
};

export const up = async (db: Database) => {
	await renameReceiptsCreated(db);
	await renameReceiptItemsCreated(db);
	await renameDebtsCreated(db);
	await renameAccountConnectionsIntentionsCreated(db);
	await renameReceiptParticipantsIntentionsAdded(db);
};

export const down = async (db: Database) => {
	await undoRenameReceiptsCreated(db);
	await undoRenameReceiptItemsCreated(db);
	await undoRenameDebtsCreated(db);
	await undoRenameAccountConnectionsIntentionsCreated(db);
	await undoRenameReceiptParticipantsIntentionsAdded(db);
};
