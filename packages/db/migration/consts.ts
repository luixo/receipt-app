import { sql } from "kysely";

import { isTestEnv } from "~db/migration/utils";

export const ACCOUNTS = {
	INDEXES: {
		EMAIL: "accounts:email:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "accounts:updateTimestamp",
	},
} as const;

export const SESSIONS = {
	INDEXES: {
		SESSION_ID: "sessions:sessionId:index",
		ACCOUNT_ID: "sessions:accountId:index",
	},
} as const;

export const USERS = {
	INDEXES: {
		OWNER_ACCOUNT_ID: "users:ownerAccountId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "users:updateTimestamp",
	},
} as const;

export const RECEIPTS = {
	INDEXES: {
		OWNER_ACCOUNT_ID: "receipts:ownerAccountId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "receipts:updateTimestamp",
	},
} as const;

export const RECEIPT_ITEMS = {
	INDEXES: {
		RECEIPT_ID: "receiptItems:receiptId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "receiptItems:updateTimestamp",
	},
} as const;

export const ITEM_PARTICIPANTS_DEPRECATED = {
	INDEXES: {
		ITEM_ID: "itemParticipants:itemId:index",
	},
	CONSTRAINTS: {
		ITEM_ID_USER_ID_PAIR: "itemParticipants:itemId-userId:primaryKey",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "itemParticipants:updateTimestamp",
	},
} as const;

export const RECEIPT_ITEM_CONSUMERS = {
	INDEXES: {
		ITEM_ID: "receiptItemConsumers:itemId:index",
	},
	CONSTRAINTS: {
		ITEM_ID_USER_ID_PAIR: "receiptItemConsumers:itemId-userId:primaryKey",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "receiptItemConsumers:updateTimestamp",
	},
} as const;

export const RECEIPT_ITEM_PAYERS = {
	TABLE_NAME: "receiptItemPayers",
	INDEXES: {
		ITEM_ID: "receiptItemPayers:itemId:index",
	},
	CONSTRAINTS: {
		ITEM_ID_USER_ID_PAIR: "receiptItemPayers:itemId-userId:primaryKey",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "receiptItemPayers:updateTimestamp",
	},
} as const;

export const RECEIPT_PARTICIPANTS = {
	INDEXES: {
		RECEIPT_ID: "receiptParticipants:receiptId:index",
		USER_ID: "receiptParticipants:userId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "receiptParticipants:updateTimestamp",
	},
} as const;

export const ACCOUNT_CONNECTIONS_INTENTIONS = {
	INDEXES: {
		ACCOUNT_ID: "accountConnectionsIntentions:accountId:index",
		TARGET_ACCOUNT_ID: "accountConnectionsIntentions:targetAccountId:index",
	},
	CONSTRAINTS: {
		ACCOUNT_PAIR: "accountConnectionsIntentions:accounts:accountPair",
		USER_PAIR: "accountConnectionsIntentions:accountUser:userPair",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "accountConnectionsIntentions:updateTimestamp",
	},
} as const;

export const ACCOUNT_SETTINGS = {
	TRIGGERS: {
		UPDATE_TIMESTAMP: "accountSettings:updateTimestamp",
	},
} as const;

export const RESET_PASSWORD_INTENTIONS = {
	INDEXES: {
		ACCOUNT_ID: "resetPasswordIntentions:accountId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "resetPasswordIntentions:updateTimestamp",
	},
} as const;

export const DEBTS = {
	INDEXES: {
		OWNER_ACCOUNT_ID: "debts:ownerAccountId:index",
		USER_ID: "debts:userId:index",
	},
	CONSTRAINTS: {
		OWNER_ID_DEBT_ID_PAIR: "debts:ownerAccountId:debtId:pair",
		OWNER_ID_RECEIPT_ID_USER_ID_TUPLE:
			"debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "debts:updateTimestamp",
	},
} as const;

export const DEBTS_SYNC_INTENTIONS = {
	INDEXES: {
		OWNER_ACCOUNT_ID: "debtsSyncIntentions:ownerAccountId:index",
		DEBT_ID: "debtsSyncIntentions:debtId:index",
	},
	TRIGGERS: {
		UPDATE_TIMESTAMP: "debtsSyncIntentions:updateTimestamp",
	},
} as const;

export const FUNCTIONS = {
	UPDATE_TIMESTAMP_COLUMN: "updateTimestampColumn",
} as const;

export const CURRENT_TIMESTAMP = isTestEnv()
	? /* c8 ignore next 2 */
		sql`TO_TIMESTAMP('2020/01/01', 'YYYY/MM/DD')`
	: sql`CURRENT_TIMESTAMP`;
