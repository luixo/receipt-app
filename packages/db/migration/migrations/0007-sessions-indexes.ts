import { SESSIONS } from "~db/migration/consts";
import type { Database } from "~db/types";

const addSessionsAccountIdIndex = async (db: Database) => {
	await db.schema.dropIndex(SESSIONS.INDEXES.SESSION_ID).execute();
	await db.schema
		.createIndex(SESSIONS.INDEXES.ACCOUNT_ID)
		.on("sessions")
		.column("accountId")
		.execute();
};

const removeSessionsAccountIdIndex = async (db: Database) => {
	await db.schema.dropIndex(SESSIONS.INDEXES.ACCOUNT_ID).execute();
	await db.schema
		.createIndex(SESSIONS.INDEXES.SESSION_ID)
		.on("sessions")
		.column("accountId")
		.execute();
};

export const up = async (db: Database) => {
	await addSessionsAccountIdIndex(db);
};

export const down = async (db: Database) => {
	await removeSessionsAccountIdIndex(db);
};
