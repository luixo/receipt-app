import { sql } from "kysely";

import type { Database } from "..";

const addNullablePublicName = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.alterColumn("publicName", (acb) => acb.dropNotNull())
		.execute();
	await db
		.updateTable("users")
		.set({ publicName: null })
		.whereRef("publicName", "=", "name")
		.execute();
};

const removeNullablePublicName = async (db: Database) => {
	await db
		.updateTable("users")
		.set({ publicName: sql.raw("name").$castTo() })
		.where("publicName", "=", "name")
		.execute();
	await db.schema
		.alterTable("users")
		.alterColumn("publicName", (acb) => acb.setNotNull())
		.execute();
};

export const up = async (db: Database) => {
	await addNullablePublicName(db);
};

export const down = async (db: Database) => {
	await removeNullablePublicName(db);
};
