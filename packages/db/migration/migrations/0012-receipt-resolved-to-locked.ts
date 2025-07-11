import type { UpdateObject } from "kysely";

import { CURRENT_TIMESTAMP } from "~db/migration/consts";
import type { Database, ReceiptsDatabase } from "~db/types";

type ReceiptsUpdateObject = UpdateObject<
	ReceiptsDatabase,
	"receipts",
	"receipts"
>;

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
				// @ts-expect-error The type doesn't exist anymore
				.when("resolved", "=", true)
				.then(CURRENT_TIMESTAMP)
				.else(null)
				.end()
				// eslint-disable-next-line no-restricted-syntax
				.$castTo<Date>(),
		})
		.execute();
};

const removeResolvedColumn = async (db: Database) => {
	await db.schema.alterTable("receipts").dropColumn("resolved").execute();
};

const removeLockedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.dropColumn("lockedTimestamp")
		.execute();
};

const addResolvedColumn = async (db: Database) => {
	await db.schema
		.alterTable("receipts")
		.addColumn("resolved", "boolean", (cb) => cb.notNull().defaultTo("false"))
		.execute();
	await db
		.updateTable("receipts")
		.set({
			// Error is expected as column does not exist anymore
			/* eslint-disable @typescript-eslint/ban-ts-comment */
			// @ts-expect-error
			resolved: db
				.case()
				// @ts-expect-error Error is expected as column does not exist anymore
				.when("lockedTimestamp", "is not", null)
				.then(true)
				.else(false)
				.end(),
			/* eslint-enable @typescript-eslint/ban-ts-comment */
		} satisfies ReceiptsUpdateObject)
		.execute();
};

export const up = async (db: Database) => {
	await addLockedTimestampColumn(db);
	await removeResolvedColumn(db);
};

export const down = async (db: Database) => {
	await addResolvedColumn(db);
	await removeLockedTimestampColumn(db);
};
