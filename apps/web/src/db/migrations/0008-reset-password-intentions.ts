import type { Database } from "..";
import { RESET_PASSWORD_INTENTIONS } from "../consts";

const addResetPasswordIntentionsTable = async (db: Database) => {
	await db.schema
		.createTable("resetPasswordIntentions")
		.ifNotExists()
		.addColumn("accountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("expiresTimestamp", "timestamp", (cb) => cb.notNull())
		.addColumn("token", "uuid", (cb) => cb.notNull())
		.execute();
	await db.schema;
	await db.schema
		.createIndex(RESET_PASSWORD_INTENTIONS.INDEXES.ACCOUNT_ID)
		.on("resetPasswordIntentions")
		.column("accountId")
		.execute();
};

const removeResetPasswordIntentionsTable = async (db: Database) => {
	await db.schema
		.dropIndex(RESET_PASSWORD_INTENTIONS.INDEXES.ACCOUNT_ID)
		.execute();
	await db.schema.dropTable("resetPasswordIntentions").ifExists().execute();
};

export const up = async (db: Database) => {
	await addResetPasswordIntentionsTable(db);
};

export const down = async (db: Database) => {
	await removeResetPasswordIntentionsTable(db);
};
