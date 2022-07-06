import { Database } from "..";

export const USERS__OWNER_ACCOUNT_ID__INDEX =
	"users:ownerAccountId:index" as const;

const addUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema
		.createIndex(USERS__OWNER_ACCOUNT_ID__INDEX)
		.on("users")
		.column("ownerAccountId")
		.execute();
};

const removeUsersOwnerAccountIdIndex = async (db: Database) => {
	await db.schema.dropIndex(USERS__OWNER_ACCOUNT_ID__INDEX).execute();
};

export const up = async (db: Database) => {
	await addUsersOwnerAccountIdIndex(db);
};

export const down = async (db: Database) => {
	await removeUsersOwnerAccountIdIndex(db);
};
