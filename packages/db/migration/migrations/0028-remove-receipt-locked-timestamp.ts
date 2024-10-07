import { CURRENT_TIMESTAMP } from "~db/consts";
import type { Database } from "~db/types";

const addLockedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.addColumn("lockedTimestamp", "timestamp")
		.execute();
	await db
		.updateTable("receipts")
		.set({
			// @ts-expect-error Error is expected as column does not exist anymore
			lockedTimestamp: db
				.case()
				.when("resolved", "=", true)
				.then(CURRENT_TIMESTAMP)
				.else(null)
				.end()
				.$castTo<Date>(),
		})
		.execute();
};

const removeLockedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.dropColumn("lockedTimestamp")
		.execute();
};

export const up = async (db: Database) => {
	await removeLockedTimestampColumn(db);
};

export const down = async (db: Database) => {
	await addLockedTimestampColumn(db);
};
