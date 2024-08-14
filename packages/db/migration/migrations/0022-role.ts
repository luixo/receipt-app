import type { Database } from "~db/types";

const addRoleColumn = async (db: Database) => {
	await db.schema.alterTable("accounts").addColumn("role", "text").execute();
};

const removeRoleColumn = async (db: Database) => {
	await db.schema.alterTable("accounts").dropColumn("role").execute();
};

export const up = async (db: Database) => {
	await addRoleColumn(db);
};

export const down = async (db: Database) => {
	await removeRoleColumn(db);
};
