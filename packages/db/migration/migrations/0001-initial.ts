import type { Database } from "~db/database";

const createAccountsTable = async (db: Database) => {
	await db.schema
		.createTable("accounts")
		.ifNotExists()
		.addColumn("id", "uuid", (cb) => cb.primaryKey().notNull())
		.addColumn("email", "varchar(255)", (cb) => cb.notNull().unique())
		.addColumn("passwordHash", "varchar(255)", (cb) => cb.notNull())
		.addColumn("passwordSalt", "varchar(255)", (cb) => cb.notNull())
		.execute();
	await db.schema
		.createIndex("accounts_email_index")
		.on("accounts")
		.column("email")
		.execute();
};

const removeAccountsTable = async (db: Database) => {
	await db.schema.dropIndex("accounts_email_index").execute();
	await db.schema.dropTable("accounts").ifExists().execute();
};

export const createAccountConnectionsTable = async (db: Database) => {
	await db.schema
		.createTable("account_connections")
		.ifNotExists()
		.addColumn("firstAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("secondAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("firstStatus", "varchar(20)", (cb) =>
			cb.notNull().defaultTo("pending"),
		)
		.addColumn("secondStatus", "varchar(20)", (cb) =>
			cb.notNull().defaultTo("pending"),
		)
		.addPrimaryKeyConstraint("account_connections_pair", [
			"firstAccountId",
			"secondAccountId",
		])
		.execute();
	await db.schema
		.createIndex("accountLinks_firstAccountId_index")
		.on("account_connections")
		.column("firstAccountId")
		.execute();
	await db.schema
		.createIndex("accountLinks_secondAccountId_index")
		.on("account_connections")
		.column("secondAccountId")
		.execute();
};

export const removeAccountConnectionsTable = async (db: Database) => {
	await db.schema.dropIndex("accountLinks_secondAccountId_index").execute();
	await db.schema.dropIndex("accountLinks_firstAccountId_index").execute();
	await db.schema.dropTable("account_connections").ifExists().execute();
};

const createReceiptsTable = async (db: Database) => {
	await db.schema
		.createTable("receipts")
		.ifNotExists()
		.addColumn("id", "uuid", (cb) => cb.notNull().primaryKey())
		.addColumn("name", "varchar(255)", (cb) => cb.notNull())
		.addColumn("currency", "varchar(3)", (cb) => cb.notNull())
		.addColumn("created", "timestamp", (cb) => cb.notNull())
		.addColumn("ownerAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("issued", "timestamp", (cb) => cb.notNull())
		.addColumn("resolved", "boolean", (cb) => cb.notNull().defaultTo("false"))
		.execute();
	await db.schema
		.createIndex("receipts_ownerAccountId_index")
		.on("receipts")
		.column("ownerAccountId")
		.execute();
};

const removeReceiptsTable = async (db: Database) => {
	await db.schema.dropIndex("receipts_ownerAccountId_index").execute();
	await db.schema.dropTable("receipts").ifExists().execute();
};

const createReceiptItemsTable = async (db: Database) => {
	await db.schema
		.createTable("receipt_items")
		.ifNotExists()
		.addColumn("id", "uuid", (cb) => cb.notNull().primaryKey())
		.addColumn("name", "varchar(255)", (cb) => cb.notNull())
		.addColumn("price", "numeric(19, 4)", (cb) => cb.notNull())
		.addColumn("quantity", "numeric(19, 4)", (cb) => cb.notNull())
		.addColumn("receiptId", "uuid", (cb) =>
			cb
				.notNull()
				.references("receipts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("locked", "boolean", (cb) =>
			cb.notNull().defaultTo("false").notNull(),
		)
		.execute();
	await db.schema
		.createIndex("receiptItems_receiptId_index")
		.on("receipt_items")
		.column("receiptId")
		.execute();
};

const removeReceiptItemsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptItems_receiptId_index").execute();
	await db.schema.dropTable("receipt_items").ifExists().execute();
};

const createSessionsTable = async (db: Database) => {
	await db.schema
		.createTable("sessions")
		.ifNotExists()
		.addColumn("sessionId", "uuid", (cb) => cb.notNull().primaryKey())
		.addColumn("accountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("expirationTimestamp", "timestamp", (cb) => cb.notNull())
		.execute();
	await db.schema
		.createIndex("sessions_sessionId_index")
		.on("sessions")
		.column("sessionId")
		.execute();
};

const removeSessionsTable = async (db: Database) => {
	await db.schema.dropIndex("sessions_sessionId_index").execute();
	await db.schema.dropTable("sessions").ifExists().execute();
};

const createUsersTable = async (db: Database) => {
	await db.schema
		.createTable("users")
		.ifNotExists()
		.addColumn("id", "uuid", (cb) => cb.notNull().primaryKey())
		.addColumn("name", "varchar(255)", (cb) => cb.notNull())
		.addColumn("publicName", "varchar(255)", (cb) => cb.notNull())
		.addColumn("ownerAccountId", "uuid", (cb) =>
			cb
				.notNull()
				.references("accounts.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("exposeReceipts", "boolean", (cb) =>
			cb.notNull().defaultTo("false"),
		)
		.addColumn("acceptReceipts", "boolean", (cb) =>
			cb.notNull().defaultTo("false"),
		)
		.addColumn("connectedAccountId", "uuid", (cb) =>
			cb.references("accounts.id").onUpdate("cascade").onDelete("set null"),
		)
		.execute();
};

const removeUsersTable = async (db: Database) => {
	await db.schema.dropTable("users").ifExists().execute();
};

const createItemParticipantsTable = async (db: Database) => {
	await db.schema
		.createTable("item_participants")
		.ifNotExists()
		.addColumn("itemId", "uuid", (cb) =>
			cb
				.notNull()
				.references("receipt_items.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addColumn("part", "numeric(5, 2)", (cb) => cb.notNull())
		.addColumn("userId", "uuid", (cb) =>
			cb
				.notNull()
				.references("users.id")
				.onUpdate("cascade")
				.onDelete("cascade"),
		)
		.addPrimaryKeyConstraint("itemParticipants_pk", ["itemId", "userId"])
		.execute();
	await db.schema
		.createIndex("itemParticipants_itemId_index")
		.on("item_participants")
		.column("itemId")
		.execute();
};

const removeItemParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("itemParticipants_itemId_index").execute();
	await db.schema.dropTable("item_participants").ifExists().execute();
};

const createReceiptParticipantsTable = async (db: Database) => {
	await db.schema
		.createTable("receipt_participants")
		.ifNotExists()
		.addColumn("receiptId", "uuid", (cb) =>
			cb
				.notNull()
				.references("receipts.id")
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
		.addColumn("role", "varchar(255)", (cb) => cb.notNull())
		.addColumn("resolved", "boolean", (cb) => cb.notNull().defaultTo("false"))
		.execute();
	await db.schema
		.createIndex("receiptParticipants_receiptId_index")
		.on("receipt_participants")
		.column("receiptId")
		.execute();
	await db.schema
		.createIndex("receiptParticipants_userId_index")
		.on("receipt_participants")
		.column("userId")
		.execute();
};

const removeReceiptParticipantsTable = async (db: Database) => {
	await db.schema.dropIndex("receiptParticipants_userId_index").execute();
	await db.schema.dropIndex("receiptParticipants_receiptId_index").execute();
	await db.schema.dropTable("receipt_participants").ifExists().execute();
};

export const up = async (db: Database) => {
	await createAccountsTable(db);
	await createAccountConnectionsTable(db);
	await createReceiptsTable(db);
	await createReceiptItemsTable(db);
	await createSessionsTable(db);
	await createUsersTable(db);
	await createItemParticipantsTable(db);
	await createReceiptParticipantsTable(db);
};

export const down = async (db: Database) => {
	await removeReceiptParticipantsTable(db);
	await removeItemParticipantsTable(db);
	await removeUsersTable(db);
	await removeSessionsTable(db);
	await removeReceiptItemsTable(db);
	await removeReceiptsTable(db);
	await removeAccountConnectionsTable(db);
	await removeAccountsTable(db);
};
