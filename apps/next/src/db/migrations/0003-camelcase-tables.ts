import { sql } from "kysely";
import { Database } from "..";

export const ACCOUNTS__EMAIL__INDEX = "accounts:email:index" as const;

const camelcaseAccountsTable = async (db: Database) => {
	await db.schema.dropIndex("accounts_email_index").execute();
	await db.schema
		.createIndex(ACCOUNTS__EMAIL__INDEX)
		.on("accounts")
		.column("email")
		.execute();
};

const uncamelcaseAccountsTable = async (db: Database) => {
	await db.schema.dropIndex(ACCOUNTS__EMAIL__INDEX).execute();
	await db.schema
		.createIndex("accounts_email_index")
		.on("accounts")
		.column("email")
		.execute();
};

export const RECEIPTS__OWNER_ACCOUNT_ID__INDEX =
	"receipts:ownerAccountId:index" as const;

const camelcaseReceiptsTable = async (db: Database) => {
	await db.schema.dropIndex("receipts_ownerAccountId_index").execute();
	await db.schema
		.createIndex(RECEIPTS__OWNER_ACCOUNT_ID__INDEX)
		.on("receipts")
		.column("ownerAccountId")
		.execute();
};

const uncamelcaseReceiptsTable = async (db: Database) => {
	await db.schema
		.withSchema("public")
		.dropIndex(RECEIPTS__OWNER_ACCOUNT_ID__INDEX)
		.execute();
	await db.schema
		.createIndex("receipts_ownerAccountId_index")
		.on("receipts")
		.column("ownerAccountId")
		.execute();
};

export const RECEIPT_ITEMS__RECEIPT_ID__INDEX =
	"receiptItems:receiptId:index" as const;

const camelcaseReceiptItemsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptItems_receiptId_index").execute();
	await db.schema
		.alterTable("receipt_items")
		.renameTo("receiptItems")
		.execute();
	await db.schema
		.createIndex(RECEIPT_ITEMS__RECEIPT_ID__INDEX)
		.on("receiptItems")
		.column("receiptId")
		.execute();
};

const uncamelcaseReceiptItemsTable = async (db: Database) => {
	await db.schema.dropIndex(RECEIPT_ITEMS__RECEIPT_ID__INDEX).execute();
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

export const SESSIONS__SESSION_ID__INDEX = "sessions:sessionId:index" as const;

const camelcaseSessionsTable = async (db: Database) => {
	await db.schema.dropIndex("sessions_sessionId_index").execute();
	await db.schema
		.createIndex(SESSIONS__SESSION_ID__INDEX)
		.on("sessions")
		.column("accountId")
		.execute();
};

const uncamelcaseSessionsTable = async (db: Database) => {
	await db.schema.dropIndex(SESSIONS__SESSION_ID__INDEX).execute();
	await db.schema
		.createIndex("sessions_sessionId_index")
		.on("sessions")
		.column("sessionId")
		.execute();
};

export const ITEM_PARTICIPANTS__ITEM_ID__INDEX =
	"itemParticipants:itemId:index" as const;
export const ITEM_PARTICIPANTS__PRIMARY_KEY =
	"itemParticipants:itemId-userId:primaryKey" as const;

const camelcaseItemParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("itemParticipants_itemId_index").execute();
	await db.schema
		.alterTable("item_participants")
		.renameTo("itemParticipants")
		.execute();
	await sql
		.raw(
			`ALTER TABLE "itemParticipants" RENAME CONSTRAINT "itemParticipants_pk" TO "${ITEM_PARTICIPANTS__PRIMARY_KEY}"`
		)
		.execute(db);
	await db.schema
		.createIndex(ITEM_PARTICIPANTS__ITEM_ID__INDEX)
		.on("itemParticipants")
		.column("itemId")
		.execute();
};

const uncamelcaseItemParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex(ITEM_PARTICIPANTS__ITEM_ID__INDEX).execute();
	await db.schema
		.alterTable("itemParticipants")
		.renameTo("item_participants")
		.execute();
	await sql
		.raw(
			`ALTER TABLE "item_participants" RENAME CONSTRAINT "${ITEM_PARTICIPANTS__PRIMARY_KEY}" TO "itemParticipants_pk"`
		)
		.execute(db);
	await db.schema
		.createIndex("itemParticipants_itemId_index")
		.on("item_participants")
		.column("itemId")
		.execute();
};

export const RECEIPT_PARTICIPANTS__RECEIPT_ID__INDEX =
	"receiptParticipants:receiptId:index" as const;
export const RECEIPT_PARTICIPANTS__USER_ID__INDEX =
	"receiptParticipants:userId:index" as const;

const camelcaseReceiptParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptParticipants_receiptId_index").execute();
	await db.schema.dropIndex("receiptParticipants_userId_index").execute();
	await db.schema
		.alterTable("receipt_participants")
		.renameTo("receiptParticipants")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS__RECEIPT_ID__INDEX)
		.on("receiptParticipants")
		.column("receiptId")
		.execute();
	await db.schema
		.createIndex(RECEIPT_PARTICIPANTS__USER_ID__INDEX)
		.on("receiptParticipants")
		.column("userId")
		.execute();
};

const uncamelcaseReceiptParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex(RECEIPT_PARTICIPANTS__RECEIPT_ID__INDEX).execute();
	await db.schema.dropIndex(RECEIPT_PARTICIPANTS__USER_ID__INDEX).execute();
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
