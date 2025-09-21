import { sql } from "kysely";

import type { Database } from "~db/database";
import {
	ACCOUNTS,
	ITEM_PARTICIPANTS_DEPRECATED,
	RECEIPTS,
	RECEIPT_ITEMS,
	RECEIPT_PARTICIPANTS,
	SESSIONS,
} from "~db/migration/consts";

const camelcaseAccountsTable = async (db: Database) => {
	await db.schema.dropIndex("accounts_email_index").execute();
	await db.schema
		.createIndex(ACCOUNTS.INDEXES.EMAIL)
		.on("accounts")
		.column("email")
		.execute();
};

const uncamelcaseAccountsTable = async (db: Database) => {
	await db.schema.dropIndex(ACCOUNTS.INDEXES.EMAIL).execute();
	await db.schema
		.createIndex("accounts_email_index")
		.on("accounts")
		.column("email")
		.execute();
};

const camelcaseReceiptsTable = async (db: Database) => {
	await db.schema.dropIndex("receipts_ownerAccountId_index").execute();
	await db.schema
		.createIndex(RECEIPTS.INDEXES.OWNER_ACCOUNT_ID)
		.on("receipts")
		.column("ownerAccountId")
		.execute();
};

const uncamelcaseReceiptsTable = async (db: Database) => {
	await db.schema
		.withSchema("public")
		.dropIndex(RECEIPTS.INDEXES.OWNER_ACCOUNT_ID)
		.execute();
	await db.schema
		.createIndex("receipts_ownerAccountId_index")
		.on("receipts")
		.column("ownerAccountId")
		.execute();
};

const camelcaseReceiptItemsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptItems_receiptId_index").execute();
	await db.schema
		.alterTable("receipt_items")
		.renameTo("receiptItems")
		.execute();
	await db.schema
		.createIndex(RECEIPT_ITEMS.INDEXES.RECEIPT_ID)
		.on("receiptItems")
		.column("receiptId")
		.execute();
};

const uncamelcaseReceiptItemsTable = async (db: Database) => {
	await db.schema.dropIndex(RECEIPT_ITEMS.INDEXES.RECEIPT_ID).execute();
	await db.schema
		.alterTable("receiptItems")
		.renameTo("receipt_items")
		.execute();
	await db.schema
		.createIndex("receiptItems_receiptId_index")
		.on("receipt_items")
		.column("receiptId")
		.execute();
};

const camelcaseSessionsTable = async (db: Database) => {
	await db.schema.dropIndex("sessions_sessionId_index").execute();
	await db.schema
		.createIndex(SESSIONS.INDEXES.SESSION_ID)
		.on("sessions")
		.column("accountId")
		.execute();
};

const uncamelcaseSessionsTable = async (db: Database) => {
	await db.schema.dropIndex(SESSIONS.INDEXES.SESSION_ID).execute();
	await db.schema
		.createIndex("sessions_sessionId_index")
		.on("sessions")
		.column("sessionId")
		.execute();
};

const camelcaseItemParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("itemParticipants_itemId_index").execute();
	await db.schema
		.alterTable("item_participants")
		.renameTo("itemParticipants")
		.execute();
	await sql
		.raw(
			`ALTER TABLE "itemParticipants" RENAME CONSTRAINT "itemParticipants_pk" TO "${ITEM_PARTICIPANTS_DEPRECATED.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}"`,
		)
		.execute(db);
	await db.schema
		.createIndex(ITEM_PARTICIPANTS_DEPRECATED.INDEXES.ITEM_ID)
		.on("itemParticipants")
		.column("itemId")
		.execute();
};

const uncamelcaseItemParticipantsTable = async (db: Database) => {
	await db.schema
		.dropIndex(ITEM_PARTICIPANTS_DEPRECATED.INDEXES.ITEM_ID)
		.execute();
	await db.schema
		.alterTable("itemParticipants")
		.renameTo("item_participants")
		.execute();
	await sql
		.raw(
			`ALTER TABLE "itemParticipants" RENAME CONSTRAINT "${ITEM_PARTICIPANTS_DEPRECATED.CONSTRAINTS.ITEM_ID_USER_ID_PAIR}" TO "itemParticipants_pk"`,
		)
		.execute(db);
	await db.schema
		.createIndex("itemParticipants_itemId_index")
		.on("item_participants")
		.column("itemId")
		.execute();
};

const camelcaseReceiptParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptParticipants_receiptId_index").execute();
	await db.schema.dropIndex("receiptParticipants_userId_index").execute();
	await db.schema
		.alterTable("receipt_participants")
		.renameTo("receiptParticipants")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS.INDEXES.RECEIPT_ID)
		.on("receiptParticipants")
		.column("receiptId")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS.INDEXES.USER_ID)
		.on("receiptParticipants")
		.column("userId")
		.execute();
};

const uncamelcaseReceiptParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex(RECEIPT_PARTICIPANTS.INDEXES.RECEIPT_ID).execute();
	await db.schema.dropIndex(RECEIPT_PARTICIPANTS.INDEXES.USER_ID).execute();
	await db.schema
		.alterTable("receiptParticipants")
		.renameTo("receipt_participants")
		.execute();
	await db.schema
		.createIndex("receiptParticipants_receiptId_index")
		.on("receipt_participants")
		.column("receiptId")
		.execute();
	await db.schema
		.createIndex("receiptParticipants_userId_index")
		.on("receipt_participants")
		.column("userId")
		.execute();
};

export const up = async (db: Database) => {
	await camelcaseAccountsTable(db);
	await camelcaseReceiptsTable(db);
	await camelcaseReceiptItemsTable(db);
	await camelcaseSessionsTable(db);
	await camelcaseItemParticipantsTable(db);
	await camelcaseReceiptParticipantsTable(db);
};

export const down = async (db: Database) => {
	await uncamelcaseReceiptParticipantsTable(db);
	await uncamelcaseItemParticipantsTable(db);
	await uncamelcaseSessionsTable(db);
	await uncamelcaseReceiptItemsTable(db);
	await uncamelcaseReceiptsTable(db);
	await uncamelcaseAccountsTable(db);
};
