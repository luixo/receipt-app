import { sql } from "kysely";

import { Database } from "..";

const addReceiptParticipantsAddedTimestampColumn = async (db: Database) => {
	await db.schema
		.alterTable("receiptParticipants")
		.addColumn("added", "timestamp")
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
		.alterColumn("added")
		.setNotNull()
		.execute();
	await db.schema
		.alterTable("receiptParticipants")
		.alterColumn("added")
		.setDefault(sql`now()`)
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
