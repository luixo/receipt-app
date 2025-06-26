import { ACCOUNT_CONNECTIONS_INTENTIONS } from "~db/migration/consts";
import type { Database } from "~db/types";

import {
	createAccountConnectionsTable,
	removeAccountConnectionsTable,
} from "./0001-initial";

const createAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.createTable("accountConnectionsIntentions")
		.ifNotExists()
		.addColumn("accountId", "uuid", (cb) =>
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
		.addColumn("targetAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("created", "timestamp", (cb) => cb.notNull())
		.addPrimaryKeyConstraint(
			ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.ACCOUNT_PAIR,
			["accountId", "targetAccountId"],
		)
		.addUniqueConstraint(ACCOUNT_CONNECTIONS_INTENTIONS.CONSTRAINTS.USER_PAIR, [
			"accountId",
			"userId",
		])
		.execute();
	await db.schema
		.createIndex(ACCOUNT_CONNECTIONS_INTENTIONS.INDEXES.ACCOUNT_ID)
		.on("accountConnectionsIntentions")
		.column("accountId")
		.execute();
	await db.schema
		.createIndex(ACCOUNT_CONNECTIONS_INTENTIONS.INDEXES.TARGET_ACCOUNT_ID)
		.on("accountConnectionsIntentions")
		.column("targetAccountId")
		.execute();
};

const removeAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.dropIndex(ACCOUNT_CONNECTIONS_INTENTIONS.INDEXES.ACCOUNT_ID)
		.execute();
	await db.schema
		.dropIndex(ACCOUNT_CONNECTIONS_INTENTIONS.INDEXES.TARGET_ACCOUNT_ID)
		.execute();
	await db.schema
		.dropTable("accountConnectionsIntentions")
		.ifExists()
		.execute();
};

export const up = async (db: Database) => {
	await createAccountConnectionsIntentionsTable(db);
	await removeAccountConnectionsTable(db);
};

export const down = async (db: Database) => {
	await removeAccountConnectionsIntentionsTable(db);
	await createAccountConnectionsTable(db);
};
