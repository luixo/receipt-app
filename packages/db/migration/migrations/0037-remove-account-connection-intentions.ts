import { sql } from "kysely";

import type { Database } from "~db/database";
import { CURRENT_TIMESTAMP, FUNCTIONS } from "~db/migration/consts";

const table = "accountConnectionsIntentions";
const accountIndex = "accountConnectionsIntentions:accountId:index";
const targetIndex = "accountConnectionsIntentions:targetAccountId:index";
const accountPair = "accountConnectionsIntentions:accounts:accountPair";
const userPair = "accountConnectionsIntentions:accountUser:userPair";
const updateTrigger = "accountConnectionsIntentions:updateTimestamp";

const createTable = async (db: Database) => {
	await db.schema
		.createTable(table)
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
		.addColumn("createdAt", "timestamptz", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addColumn("updatedAt", "timestamptz", (cb) =>
			cb.notNull().defaultTo(CURRENT_TIMESTAMP),
		)
		.addPrimaryKeyConstraint(accountPair, ["accountId", "targetAccountId"])
		.addUniqueConstraint(userPair, ["accountId", "userId"])
		.execute();
	await db.schema
		.createIndex(accountIndex)
		.on(table)
		.column("accountId")
		.execute();
	await db.schema
		.createIndex(targetIndex)
		.on(table)
		.column("targetAccountId")
		.execute();
	await sql`
		CREATE TRIGGER ${sql.id(updateTrigger)}
			BEFORE UPDATE ON ${sql.table(table)}
			FOR EACH ROW
			EXECUTE PROCEDURE ${sql.raw(FUNCTIONS.UPDATE_TIMESTAMP_COLUMN)} ();
	`.execute(db);
};

const dropTable = async (db: Database) => {
	await sql`DROP TRIGGER IF EXISTS ${sql.id(updateTrigger)} ON ${sql.table(table)}`.execute(
		db,
	);
	await db.schema.dropIndex(accountIndex).ifExists().execute();
	await db.schema.dropIndex(targetIndex).ifExists().execute();
	await db.schema.dropTable(table).ifExists().execute();
};

export const up = async (db: Database) => {
	await sql`
		UPDATE users
		SET "connectedAccountId" = intentions."targetAccountId"
		FROM "accountConnectionsIntentions" intentions
		WHERE users.id = intentions."userId"
		  AND users."ownerAccountId" = intentions."accountId"
		  AND users."connectedAccountId" IS NULL
	`.execute(db);
	await dropTable(db);
};

export const down = async (db: Database) => {
	await createTable(db);
	await sql`
		INSERT INTO ${sql.table(table)} ("accountId", "userId", "targetAccountId")
		SELECT users."ownerAccountId", users.id, users."connectedAccountId"
		FROM users
		LEFT JOIN users reciprocal
			ON reciprocal."ownerAccountId" = users."connectedAccountId"
			AND reciprocal."connectedAccountId" = users."ownerAccountId"
		WHERE users."connectedAccountId" IS NOT NULL
		  AND reciprocal.id IS NULL
	`.execute(db);
};
