import { Database } from "..";
import { DEBTS_SYNC_INTENTIONS } from "../consts";

export const createDebtsSyncIntentionsTable = async (db: Database) => {
	await db.schema
		.createTable("debtsSyncIntentions")
		.addColumn("debtId", "uuid", (cb) => cb.notNull().unique())
		.addColumn("ownerAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("lockedTimestamp", "timestamp", (cb) => cb.notNull())
		.execute();
	await db.schema
		.createIndex(DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_ACCOUNT_ID)
		.on("debtsSyncIntentions")
		.column("ownerAccountId")
		.execute();
	await db.schema
		.createIndex(DEBTS_SYNC_INTENTIONS.INDEXES.DEBT_ID)
		.on("debtsSyncIntentions")
		.column("debtId")
		.execute();
};

export const removeDebtsSyncIntentionsTable = async (db: Database) => {
	await db.schema
		.dropIndex(DEBTS_SYNC_INTENTIONS.INDEXES.OWNER_ACCOUNT_ID)
		.execute();
	await db.schema.dropIndex(DEBTS_SYNC_INTENTIONS.INDEXES.DEBT_ID).execute();
	await db.schema.dropTable("debtsSyncIntentions").execute();
};

const addLockedTimestampField = async (db: Database) => {
	await db.schema
		.alterTable("debts")
		.addColumn("lockedTimestamp", "timestamp")
		.execute();
};

const removeLockedTimestampField = async (db: Database) => {
	await db.schema.alterTable("debts").dropColumn("lockedTimestamp").execute();
};

export const up = async (db: Database) => {
	await createDebtsSyncIntentionsTable(db);
	await addLockedTimestampField(db);
};

export const down = async (db: Database) => {
	await removeLockedTimestampField(db);
	await removeDebtsSyncIntentionsTable(db);
};
