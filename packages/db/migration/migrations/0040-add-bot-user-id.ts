import type { Database } from "~db/database";
import { SESSIONS } from "~db/migration/consts";

const addSessionsBotUserId = async (db: Database) => {
	await db.schema
		.alterTable("sessions")
		.addColumn("botUserId", "text", (cb) => cb.defaultTo(null))
		.execute();
	await db.schema
		.createIndex(SESSIONS.INDEXES.BOT_USER_ID)
		.on("sessions")
		.column("botUserId")
		.execute();
};

const removeSessionsBotUserId = async (db: Database) => {
	await db.schema.dropIndex(SESSIONS.INDEXES.BOT_USER_ID).execute();
	await db.schema.alterTable("sessions").dropColumn("botUserId").execute();
};

export const up = async (db: Database) => {
	await addSessionsBotUserId(db);
};

export const down = async (db: Database) => {
	await removeSessionsBotUserId(db);
};
