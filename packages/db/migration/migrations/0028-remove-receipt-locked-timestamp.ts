import { CURRENT_TIMESTAMP } from "~db/migration/consts";
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
				// @ts-expect-error Error is expected as column does not exist anymore
				.when("resolved", "=", true)
				.then(CURRENT_TIMESTAMP)
				.else(null)
				.end()
				// eslint-disable-next-line no-restricted-syntax
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
