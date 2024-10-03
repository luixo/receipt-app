import type { Database } from "~db/types";

const addLockedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.addColumn("lockedTimestamp", "timestamp")
		.execute();
};

const removeLockedTimestampColumn = async (db: Database) => {
	await db.schema.alterTable("debts").dropColumn("lockedTimestamp").execute();
};

export const up = async (db: Database) => {
	await removeLockedTimestampColumn(db);
};

export const down = async (db: Database) => {
	await addLockedTimestampColumn(db);
};
