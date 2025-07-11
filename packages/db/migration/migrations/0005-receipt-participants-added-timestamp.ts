import { sql } from "kysely";

import { CURRENT_TIMESTAMP } from "~db/migration/consts";
import type { Database } from "~db/types";

const addReceiptParticipantsAddedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.addColumn("added", "timestamp", (cb) => cb.defaultTo(CURRENT_TIMESTAMP))
		.execute();
	await db
		.updateTable("receiptParticipants")
		.set({
			// @ts-expect-error: Database schema has changed
			// eslint-disable-next-line no-restricted-syntax
			added: sql<Date>`receipts.created + random() * interval '1 hour'`,
		})
		.from("receipts")
		.whereRef("receiptParticipants.receiptId", "=", "receipts.id")
		.execute();
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("added", (acb) => acb.setNotNull())
		.execute();
};

const removeReceiptParticipantsAddedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.dropColumn("added")
		.execute();
};

export const up = async (db: Database) => {
	await addReceiptParticipantsAddedTimestampColumn(db);
};

export const down = async (db: Database) => {
	await removeReceiptParticipantsAddedTimestampColumn(db);
};
