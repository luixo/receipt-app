import type { Database } from "~db/types";

const addLockedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptItems")
		.addColumn("locked", "boolean", (cb) =>
			cb.notNull().defaultTo("false").notNull(),
		)
		.execute();
};

const removeLockedTimestampColumn = async (db: Database) => {
	await db.schema.alterTable("receiptItems").dropColumn("locked").execute();
};

export const up = async (db: Database) => {
	await removeLockedTimestampColumn(db);
};

export const down = async (db: Database) => {
	await addLockedTimestampColumn(db);
};
