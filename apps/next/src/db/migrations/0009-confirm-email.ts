import { Database } from "..";

const addEmailConfirmationField = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.addColumn("confirmationToken", "uuid")
		.execute();
	await db.schema
		.alterTable("accounts")
		.addColumn("confirmationTokenTimestamp", "timestamp")
		.execute();
};

const removeEmailConfirmationField = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.dropColumn("confirmationToken")
		.execute();
	await db.schema
		.alterTable("accounts")
		.dropColumn("confirmationTokenTimestamp")
		.execute();
};

export const up = async (db: Database) => {
	await addEmailConfirmationField(db);
};

export const down = async (db: Database) => {
	await removeEmailConfirmationField(db);
};
