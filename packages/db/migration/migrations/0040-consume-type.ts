import { sql } from "kysely";

import type { Database } from "~db/database";

export const up = async (db: Database) => {
	await db.schema
		.createType("consumeType")
		.asEnum(["parts", "percent", "amount"])
		.execute();
	await db.schema
		.alterTable("receipts")
		.addColumn("consumeType", sql`"consumeType"`, (cb) =>
			cb.notNull().defaultTo("parts"),
		)
		.execute();
	await db.schema
		.alterTable("receiptItems")
		.addColumn("consumeType", sql`"consumeType"`)
		.execute();
};

export const down = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.dropColumn("consumeType")
		.execute();
	await db.schema.alterTable("receipts").dropColumn("consumeType").execute();
	await db.schema.dropType("consumeType").execute();
};
