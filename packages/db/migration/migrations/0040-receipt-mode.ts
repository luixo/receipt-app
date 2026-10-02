import { sql } from "kysely";

import type { Database } from "~db/database";

export const up = async (db: Database) => {
	await db.schema
		.createType("receiptMode")
		.asEnum(["single", "multiple"])
		.execute();
	await db.schema
		.alterTable("receipts")
		.addColumn("mode", sql`"receiptMode"`, (cb) =>
			cb.notNull().defaultTo("multiple"),
		)
		.execute();
};

export const down = async (db: Database) => {
	await db.schema.alterTable("receipts").dropColumn("mode").execute();
	await db.schema.dropType("receiptMode").execute();
};
