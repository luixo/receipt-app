import { sql } from "kysely";

import type { Database } from "~db/database";

const addNullablePublicName = async (db: Database) => {
	await db.schema
		.alterTable("users")
		.alterColumn("publicName", (acb) => acb.dropNotNull())
		.execute();
	// oxlint-disable-next-line typescript/no-unsafe-call
	await db
		// @ts-expect-error This is an outdated schema
		.updateTable("users")
		// @ts-expect-error This is an outdated schema
		.set({ publicName: null })
		// oxlint-disable-next-line typescript/no-unsafe-member-access
		.whereRef("publicName", "=", "name")
		// oxlint-disable-next-line typescript/no-unsafe-member-access
		.execute();
};

const removeNullablePublicName = async (db: Database) => {
	// oxlint-disable-next-line typescript/no-unsafe-call
	await db
		// @ts-expect-error This is an outdated schema
		.updateTable("users")
		// @ts-expect-error This is an outdated schema
		.set({ publicName: sql.raw("name").$castTo() })
		// oxlint-disable-next-line typescript/no-unsafe-member-access
		.where("publicName", "=", "name")
		// oxlint-disable-next-line typescript/no-unsafe-member-access
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
