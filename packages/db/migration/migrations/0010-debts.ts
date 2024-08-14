import { DEBTS } from "~db/consts";
import type { Database } from "~db/types";

const createDebtsTable = async (db: Database) => {
	await db.schema
		.createTable("debts")
		.addColumn("id", "uuid", (cb) => cb.notNull())
		.addColumn("ownerAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("userId", "uuid", (cb) =>
			cb
				.notNull()
				.references("users.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("currency", "varchar(3)", (cb) => cb.notNull())
		.addColumn("amount", "numeric(19, 4)", (cb) => cb.notNull())
		.addColumn("timestamp", "timestamp", (cb) => cb.notNull())
		.addColumn("created", "timestamp", (cb) => cb.notNull())
		.addColumn("note", "varchar(255)", (cb) => cb.notNull())
		.addPrimaryKeyConstraint(DEBTS.CONSTRAINTS.OWNER_ID_DEBT_ID_PAIR, [
			"id",
			"ownerAccountId",
		])
		.execute();
	await db.schema
		.createIndex(DEBTS.INDEXES.OWNER_ACCOUNT_ID)
		.on("debts")
		.column("ownerAccountId")
		.execute();
	await db.schema
		.createIndex(DEBTS.INDEXES.USER_ID)
		.on("debts")
		.column("userId")
		.execute();
};

const removeDebtsTable = async (db: Database) => {
	await db.schema.dropIndex(DEBTS.INDEXES.OWNER_ACCOUNT_ID).execute();
	await db.schema.dropIndex(DEBTS.INDEXES.USER_ID).execute();
	await db.schema.dropTable("debts").execute();
};

export const up = async (db: Database) => {
	await createDebtsTable(db);
};

export const down = async (db: Database) => {
	await removeDebtsTable(db);
};
