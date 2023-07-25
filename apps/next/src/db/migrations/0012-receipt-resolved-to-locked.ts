import { sql, UpdateObject } from "kysely";

import { Database } from "..";
import { ReceiptsDatabase } from "../types";

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
			lockedTimestamp:
				sql`case when resolved then now() else null end`.castTo<Date>(),
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
			// Types are different at the moment, so one might expect an error
			// @ts-expect-error
			resolved: sql`case when "lockedTimestamp" is not null then true else false end`,
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
