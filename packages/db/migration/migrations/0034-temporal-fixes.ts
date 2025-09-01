import { sql } from "kysely";

import { CURRENT_TIMESTAMP } from "~db/migration/consts";
import type { Database } from "~db/types";

const toTsTz = (columnName: string) =>
	sql`timestamptz using ${sql.id(columnName)} at time zone 'UTC'`;
const toTs = (columnName: string) => sql`timestamp using ${sql.id(columnName)}`;
const toDate = (columnName: string) => sql`date using ${sql.id(columnName)}`;

const upgradeAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("createdAt", (col) => col.setDefault(CURRENT_TIMESTAMP))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("createdAt", (col) => col.dropDefault())
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

const upgradeAccountSettingsTable = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeAccountSettingsTable = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

const upgradeAccountsTable = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.alterColumn("confirmationTokenTimestamp", (col) =>
			col.setDataType(toTsTz("confirmationTokenTimestamp")),
		)
		.execute();
};

const downgradeAccountsTable = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.alterColumn("confirmationTokenTimestamp", (col) =>
			col.setDataType(toTs("confirmationTokenTimestamp")),
		)
		.execute();
};

const upgradeDebtsTable = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("createdAt", (col) => col.setDefault(CURRENT_TIMESTAMP))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.alterColumn("timestamp", (col) => col.setDataType(toDate("timestamp")))
		.execute();
};

const downgradeDebtsTable = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("createdAt", (col) => col.dropDefault())
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.alterColumn("timestamp", (col) => col.setDataType(toTs("timestamp")))
		.execute();
};

const upgradeReceiptItemsConsumersTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptItemConsumers")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeReceiptItemsConsumersTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptItemConsumers")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

const upgradeReceiptItemsTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeReceiptItemsTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

const upgradeReceiptParticipantsTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeReceiptParticipantsTable = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

const upgradeReceiptsTable = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.alterColumn("issued", (col) => col.setDataType(toDate("issued")))
		.execute();
};

const downgradeReceiptsTable = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.alterColumn("issued", (col) => col.setDataType(toTs("issued")))
		.execute();
};

const upgradeResetPasswordIntentionsTable = async (db: Database) => {
	await db.schema
		.alterTable("resetPasswordIntentions")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.alterColumn("expiresTimestamp", (col) =>
			col.setDataType(toTsTz("expiresTimestamp")),
		)
		.execute();
};

const downgradeResetPasswordIntentionsTable = async (db: Database) => {
	await db.schema
		.alterTable("resetPasswordIntentions")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.alterColumn("expiresTimestamp", (col) =>
			col.setDataType(toTs("expiresTimestamp")),
		)
		.execute();
};

const upgradeSessionsTable = async (db: Database) => {
	await db.schema
		.alterTable("sessions")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("expirationTimestamp", (col) =>
			col.setDataType(toTsTz("expirationTimestamp")),
		)
		.execute();
};

const downgradeSessionsTable = async (db: Database) => {
	await db.schema
		.alterTable("sessions")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("expirationTimestamp", (col) =>
			col.setDataType(toTs("expirationTimestamp")),
		)
		.execute();
};

const upgradeUsersTable = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.alterColumn("createdAt", (col) => col.setDataType(toTsTz("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTsTz("updatedAt")))
		.execute();
};

const downgradeUsersTable = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.alterColumn("createdAt", (col) => col.setDataType(toTs("createdAt")))
		.alterColumn("updatedAt", (col) => col.setDataType(toTs("updatedAt")))
		.execute();
};

export const up = async (db: Database) => {
	await upgradeAccountConnectionsIntentionsTable(db);
	await upgradeAccountSettingsTable(db);
	await upgradeAccountsTable(db);
	await upgradeDebtsTable(db);
	await upgradeReceiptItemsConsumersTable(db);
	await upgradeReceiptItemsTable(db);
	await upgradeReceiptParticipantsTable(db);
	await upgradeReceiptsTable(db);
	await upgradeResetPasswordIntentionsTable(db);
	await upgradeSessionsTable(db);
	await upgradeUsersTable(db);
};

export const down = async (db: Database) => {
	await downgradeAccountConnectionsIntentionsTable(db);
	await downgradeAccountSettingsTable(db);
	await downgradeAccountsTable(db);
	await downgradeDebtsTable(db);
	await downgradeReceiptItemsConsumersTable(db);
	await downgradeReceiptItemsTable(db);
	await downgradeReceiptParticipantsTable(db);
	await downgradeReceiptsTable(db);
	await downgradeResetPasswordIntentionsTable(db);
	await downgradeSessionsTable(db);
	await downgradeUsersTable(db);
};
