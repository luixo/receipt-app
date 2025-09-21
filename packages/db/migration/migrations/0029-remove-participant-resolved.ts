import type { Database } from "~db/database";

const addResolvedColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.addColumn("resolved", "boolean", (cb) => cb.notNull().defaultTo("false"))
		.execute();
};

const removeResolvedColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.dropColumn("resolved")
		.execute();
};

export const up = async (db: Database) => {
	await removeResolvedColumn(db);
};

export const down = async (db: Database) => {
	await addResolvedColumn(db);
};
