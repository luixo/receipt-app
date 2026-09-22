import type { Database } from "~db/database";
import { PEERS } from "~db/migration/consts";

const addUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema
		.createIndex(PEERS.INDEXES.OWNER_ACCOUNT_ID.replace("peer", "user"))
		.on("users")
		.column("ownerAccountId")
		.execute();
};

const removeUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema
		.dropIndex(PEERS.INDEXES.OWNER_ACCOUNT_ID.replace("peer", "user"))
		.execute();
};

export const up = async (db: Database) => {
	await addUsersOwnerAccountIdIndex(db);
};

export const down = async (db: Database) => {
	await removeUsersOwnerAccountIdIndex(db);
};
