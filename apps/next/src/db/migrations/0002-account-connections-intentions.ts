import { Database } from "..";
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
			"accountConnectionsIntentions:accounts:accountPair",
			["accountId", "targetAccountId"]
		)
		.addUniqueConstraint("accountConnectionsIntentions:accountUser:userPair", [
			"accountId",
			"userId",
		])
		.execute();
	await db.schema
		.createIndex("accountConnectionsIntentions:accountId:index")
		.on("accountConnectionsIntentions")
		.column("accountId")
		.execute();
	await db.schema
		.createIndex("accountConnectionsIntentions:targetAccountId:index")
		.on("accountConnectionsIntentions")
		.column("targetAccountId")
		.execute();
};

const removeAccountConnectionsIntentionsTable = async (db: Database) => {
	await db.schema
		.dropIndex("accountConnectionsIntentions:accountId:index")
		.execute();
	await db.schema
		.dropIndex("accountConnectionsIntentions:targetAccountId:index")
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
