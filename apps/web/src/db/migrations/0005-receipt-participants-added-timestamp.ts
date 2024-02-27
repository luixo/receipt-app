import { sql } from "kysely";

import type { Database } from "..";

const addReceiptParticipantsAddedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.addColumn("added", "timestamp", (cb) => cb.defaultTo(sql`now()`))
		.execute();
	await db
		.updateTable("receiptParticipants")
		.set({
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
	await db.schema.alterTable("receiptParticipants").dropColumn("added");
};

export const up = async (db: Database) => {
	await addReceiptParticipantsAddedTimestampColumn(db);
};

export const down = async (db: Database) => {
	await removeReceiptParticipantsAddedTimestampColumn(db);
};
