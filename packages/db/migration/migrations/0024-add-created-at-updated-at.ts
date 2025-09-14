import { sql } from "kysely";

import {
	ACCOUNTS,
	ACCOUNT_CONNECTIONS_INTENTIONS,
	ACCOUNT_SETTINGS,
	CURRENT_TIMESTAMP,
	DEBTS,
	FUNCTIONS,
	ITEM_PARTICIPANTS_DEPRECATED,
	RECEIPTS,
	RECEIPT_ITEMS,
	RECEIPT_PARTICIPANTS,
	RESET_PASSWORD_INTENTIONS,
	USERS,
} from "~db/migration/consts";
import { isTestEnv } from "~db/migration/utils";
import type { Database } from "~db/types";
import { parsers } from "~utils/date";

const updateColumn = "updatedAt";
// Project inception date
const defaultCreatedDate = parsers.zonedDateTime(
	"2020-12-04T07:10:00.000[GMT]",
);

const createUpdateFunction = async (db: Database) => {
	await sql`
	CREATE OR REPLACE FUNCTION ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ()
		RETURNS TRIGGER
		AS $$
			BEGIN
				NEW.${sql.id(updateColumn)} = ${sql.raw(
					isTestEnv()
						? `OLD."${updateColumn}" + '1 minute'::interval`
						: "now()",
				)};
				RETURN NEW;
			END;
		$$
	LANGUAGE 'plpgsql';
	`.execute(db);
};

const addAccountCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.addColumn("createdAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("accounts")
		.set({ createdAt: defaultCreatedDate, updatedAt: defaultCreatedDate })
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(ACCOUNTS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("accounts")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addAccountConnectionsIntentionsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("accountConnectionsIntentions")
		.set({
			updatedAt: (eb) => eb.ref("accountConnectionsIntentions.createdAt"),
		})
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(
		ACCOUNT_CONNECTIONS_INTENTIONS.TRIGGERS.UPDATE_TIMESTAMP,
	)}
    BEFORE UPDATE ON ${sql.table("accountConnectionsIntentions")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addAccountSettingsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("accountSettings")
		.set({ updatedAt: defaultCreatedDate })
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(ACCOUNT_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("accountSettings")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addDebtsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("debts")
		.set({
			updatedAt: (eb) => eb.ref("debts.createdAt"),
		})
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(DEBTS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("debts")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addItemParticipantsCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("itemParticipants")
		.addColumn("createdAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		// Casting as table is renamed
		.updateTable("itemParticipants" as "receiptItemConsumers")
		.set({ createdAt: defaultCreatedDate, updatedAt: defaultCreatedDate })
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(ITEM_PARTICIPANTS_DEPRECATED.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("itemParticipants")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addReceiptItemsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("receiptItems")
		.set({
			updatedAt: (eb) => eb.ref("receiptItems.createdAt"),
		})
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(RECEIPT_ITEMS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("receiptItems")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addReceiptParticipantsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("receiptParticipants")
		.set({
			updatedAt: (eb) => eb.ref("receiptParticipants.createdAt"),
		})
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(RECEIPT_PARTICIPANTS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("receiptParticipants")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addReceiptsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("receipts")
		.set({
			updatedAt: (eb) => eb.ref("receipts.createdAt"),
		})
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(RECEIPTS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("receipts")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addResetPasswordIntentionsCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("resetPasswordIntentions")
		.addColumn("createdAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("resetPasswordIntentions")
		.set({ createdAt: defaultCreatedDate, updatedAt: defaultCreatedDate })
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(RESET_PASSWORD_INTENTIONS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("resetPasswordIntentions")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const addSessionsCreatedAt = async (db: Database) => {
	await db.schema
		.alterTable("sessions")
		.addColumn("createdAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("sessions")
		.set({ createdAt: defaultCreatedDate })
		.execute();
};

const addUsersCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.addColumn("createdAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamp", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.execute();
	await db
		.updateTable("users")
		.set({ createdAt: defaultCreatedDate, updatedAt: defaultCreatedDate })
		.execute();
	await sql`
	CREATE TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP)}
    BEFORE UPDATE ON ${sql.table("users")}
    FOR EACH ROW
    EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const removeUpdateFunction = async (db: Database) => {
	await sql`DROP FUNCTION ${sql.raw(
		FUNCTIONS.UPDATE_TIMESTAMP_COLUMN,
	)}();`.execute(db);
};

const removeAccountCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.dropColumn("createdAt")
		.dropColumn("updatedAt")
		.execute();

	await sql`
	DROP TRIGGER ${sql.id(ACCOUNTS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table(
		"accounts",
	)};`.execute(db);
};

const removeAccountConnectionsIntentionsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accountConnectionsIntentions")
		.dropColumn("updatedAt")
		.execute();
	await sql`
	DROP TRIGGER ${sql.id(
		ACCOUNT_CONNECTIONS_INTENTIONS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("accountConnectionsIntentions")};`.execute(db);
};

const removeAccountSettingsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("accountSettings")
		.dropColumn("updatedAt")
		.execute();
	await sql`
	DROP TRIGGER ${sql.id(
		ACCOUNT_SETTINGS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("accountSettings")};`.execute(db);
};

const removeDebtsUpdatedAt = async (db: Database) => {
	await db.schema.alterTable("debts").dropColumn("updatedAt").execute();
	await sql`
	DROP TRIGGER ${sql.id(DEBTS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table(
		"debts",
	)};`.execute(db);
};

const removeItemParticipantsCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("itemParticipants")
		.dropColumn("createdAt")
		.dropColumn("updatedAt")
		.execute();

	await sql`
	DROP TRIGGER ${sql.id(
		ITEM_PARTICIPANTS_DEPRECATED.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("itemParticipants")};`.execute(db);
};

const removeReceiptItemsUpdatedAt = async (db: Database) => {
	await db.schema.alterTable("receiptItems").dropColumn("updatedAt").execute();
	await sql`
	DROP TRIGGER ${sql.id(RECEIPT_ITEMS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table(
		"receiptItems",
	)};`.execute(db);
};

const removeReceiptParticipantsUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.dropColumn("updatedAt")
		.execute();
	await sql`
	DROP TRIGGER ${sql.id(
		RECEIPT_PARTICIPANTS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("receiptParticipants")};`.execute(db);
};

const removeReceiptsUpdatedAt = async (db: Database) => {
	await db.schema.alterTable("receipts").dropColumn("updatedAt").execute();
	await sql`
	DROP TRIGGER ${sql.id(RECEIPTS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table(
		"receipts",
	)};`.execute(db);
};

const removeResetPasswordIntentionsCreatedAtUpdatedAt = async (
	db: Database,
) => {
	await db.schema
		.alterTable("resetPasswordIntentions")
		.dropColumn("createdAt")
		.dropColumn("updatedAt")
		.execute();

	await sql`
	DROP TRIGGER ${sql.id(
		RESET_PASSWORD_INTENTIONS.TRIGGERS.UPDATE_TIMESTAMP,
	)} ON ${sql.table("resetPasswordIntentions")};`.execute(db);
};

const removeSessionsCreatedAt = async (db: Database) => {
	await db.schema.alterTable("sessions").dropColumn("createdAt").execute();
};

const removeUsersCreatedAtUpdatedAt = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.dropColumn("createdAt")
		.dropColumn("updatedAt")
		.execute();

	await sql`
	DROP TRIGGER ${sql.id(USERS.TRIGGERS.UPDATE_TIMESTAMP)} ON ${sql.table(
		"users",
	)};`.execute(db);
};

export const up = async (db: Database) => {
	await createUpdateFunction(db);

	await addAccountCreatedAtUpdatedAt(db);
	await addAccountConnectionsIntentionsUpdatedAt(db);
	await addAccountSettingsUpdatedAt(db);
	await addDebtsUpdatedAt(db);
	await addItemParticipantsCreatedAtUpdatedAt(db);
	await addReceiptItemsUpdatedAt(db);
	await addReceiptParticipantsUpdatedAt(db);
	await addReceiptsUpdatedAt(db);
	await addResetPasswordIntentionsCreatedAtUpdatedAt(db);
	await addSessionsCreatedAt(db);
	await addUsersCreatedAtUpdatedAt(db);
};

export const down = async (db: Database) => {
	await removeAccountCreatedAtUpdatedAt(db);
	await removeAccountConnectionsIntentionsUpdatedAt(db);
	await removeAccountSettingsUpdatedAt(db);
	await removeDebtsUpdatedAt(db);
	await removeItemParticipantsCreatedAtUpdatedAt(db);
	await removeReceiptItemsUpdatedAt(db);
	await removeReceiptParticipantsUpdatedAt(db);
	await removeReceiptsUpdatedAt(db);
	await removeResetPasswordIntentionsCreatedAtUpdatedAt(db);
	await removeSessionsCreatedAt(db);
	await removeUsersCreatedAtUpdatedAt(db);

	await removeUpdateFunction(db);
};
