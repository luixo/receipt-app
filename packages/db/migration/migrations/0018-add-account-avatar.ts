import type { Database } from "~db/types";

const addAccountAvatarUrl = async (db: Database) => {
	await db.schema
		.alterTable("accounts")
		.addColumn("avatarUrl", "text", (cb) => cb.defaultTo(null))
		.execute();
};

const removeAccountAvatarUrl = async (db: Database) => {
	await db.schema.alterTable("accounts").dropColumn("avatarUrl").execute();
};

export const up = async (db: Database) => {
	await addAccountAvatarUrl(db);
};

export const down = async (db: Database) => {
	await removeAccountAvatarUrl(db);
};
