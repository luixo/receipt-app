import { Database } from "..";
import {
	createAccountConnectionsTable,
	removeAccountConnectionsTable,
} from "./0001-initial";

export const ACCOUNT_CONNECTIONS_INTENTIONS__ACCOUNT_ID__INDEX =
	"accountConnectionsIntentions:accountId:index" as const;
export const ACCOUNT_CONNECTIONS_INTENTIONS__TARGET_ACCOUNT_ID__INDEX =
	"accountConnectionsIntentions:targetAccountId:index" as const;

export const ACCOUNT_CONNECTIONS_INTENTIONS__ACCOUNT_PAIR__CONSTRAINT =
	"accountConnectionsIntentions:accounts:accountPair" as const;
export const ACCOUNT_CONNECTIONS_INTENTIONS__USER_PAIR__CONSTRAINT =
	"accountConnectionsIntentions:accountUser:userPair" as const;

const createAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.createTable("accountConnectionsIntentions")
		.ifNotExists()
		.addColumn("accountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade")
		)
		.addColumn("userId", "uuid", (cb) =>
			cb
				.notNull()
				.references("users.id")
				.onUpdate("cascade")
				.onDelete("cascade")
		)
		.addColumn("targetAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade")
		)
		.addColumn("created", "timestamp", (cb) => cb.notNull())
		.addPrimaryKeyConstraint(
			ACCOUNT_CONNECTIONS_INTENTIONS__ACCOUNT_PAIR__CONSTRAINT,
			["accountId", "targetAccountId"]
		)
		.addUniqueConstraint(
			ACCOUNT_CONNECTIONS_INTENTIONS__USER_PAIR__CONSTRAINT,
			["accountId", "userId"]
		)
		.execute();
	await db.schema
		.createIndex(ACCOUNT_CONNECTIONS_INTENTIONS__ACCOUNT_ID__INDEX)
		.on("accountConnectionsIntentions")
		.column("accountId")
		.execute();
	await db.schema
		.createIndex(ACCOUNT_CONNECTIONS_INTENTIONS__TARGET_ACCOUNT_ID__INDEX)
		.on("accountConnectionsIntentions")
		.column("targetAccountId")
		.execute();
};

const removeAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.dropIndex(ACCOUNT_CONNECTIONS_INTENTIONS__ACCOUNT_ID__INDEX)
		.execute();
	await db.schema
		.dropIndex(ACCOUNT_CONNECTIONS_INTENTIONS__TARGET_ACCOUNT_ID__INDEX)
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
