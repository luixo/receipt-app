import type { Database } from "~db/types";

const addAccountSettings = async (db: Database) => {
	await db.schema
		.createTable("accountSettings")
		.ifNotExists()
		.addColumn("accountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("autoAcceptDebts", "boolean", (cb) => cb.notNull())
		.execute();
};

const removeAccountSettings = async (db: Database) => {
	await db.schema.dropTable("accountSettings").ifExists().execute();
};

export const up = async (db: Database) => {
	await addAccountSettings(db);
};

export const down = async (db: Database) => {
	await removeAccountSettings(db);
};
