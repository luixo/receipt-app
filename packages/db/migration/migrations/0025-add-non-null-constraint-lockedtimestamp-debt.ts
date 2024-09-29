import { sql } from "kysely";

import type { Database } from "~db/types";

const addNonNullConstraint = async (db: Database) => {
	await db
		.updateTable("debts")
		.where("lockedTimestamp", "is", null)
		.set({ lockedTimestamp: (eb) => eb.ref("debts.updatedAt") })
		.execute();
	await db.schema
		.alterTable("debts")
		.alterColumn("lockedTimestamp", (cb) => cb.setNotNull())
		.alterColumn("lockedTimestamp", (cb) => cb.dropDefault())
		.execute();
};

const removeNonNullConstraint = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.alterColumn("lockedTimestamp", (cb) => cb.dropNotNull())
		.alterColumn("lockedTimestamp", (cb) => cb.setDefault(sql`now()`))
		.execute();
};

export const up = async (db: Database) => {
	await addNonNullConstraint(db);
};

export const down = async (db: Database) => {
	await removeNonNullConstraint(db);
};
