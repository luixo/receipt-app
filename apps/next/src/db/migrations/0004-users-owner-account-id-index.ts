import { Database } from "..";
import { USERS } from "../consts";

const addUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema
		.createIndex(USERS.INDEXES.OWNER_ACCOUNT_ID)
		.on("users")
		.column("ownerAccountId")
		.execute();
};

const removeUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema.dropIndex(USERS.INDEXES.OWNER_ACCOUNT_ID).execute();
};

export const up = async (db: Database) => {
	await addUsersOwnerAccountIdIndex(db);
};

export const down = async (db: Database) => {
	await removeUsersOwnerAccountIdIndex(db);
};
