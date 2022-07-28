export const ACCOUNTS = {
	INDEXES: {
		EMAIL: "accounts:email:index",
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
} as const;

export const RECEIPTS = {
	INDEXES: {
		OWNER_ACCOUNT_ID: "receipts:ownerAccountId:index",
	},
} as const;

export const RECEIPT_ITEMS = {
	INDEXES: {
		RECEIPT_ID: "receiptItems:receiptId:index",
	},
} as const;

export const ITEM_PARTICIPANTS = {
	INDEXES: {
		ITEM_ID: "itemParticipants:itemId:index",
	},
	CONSTRAINTS: {
		ITEM_ID_USER_ID_PAIR: "itemParticipants:itemId-userId:primaryKey",
	},
} as const;

export const RECEIPT_PARTICIPANTS = {
	INDEXES: {
		RECEIPT_ID: "receiptParticipants:receiptId:index",
		USER_ID: "receiptParticipants:userId:index",
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
} as const;

export const RESET_PASSWORD_INTENTIONS = {
	INDEXES: {
		ACCOUNT_ID: "resetPasswordIntentions:accountId:index",
	},
} as const;
