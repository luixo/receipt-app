// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";
import type { UsersId } from "./users";

export default interface AccountConnectionsIntentions {
	/**
	 * Index: accountConnectionsIntentions:accountUser:userPair
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountId:index
	 */
	accountId: AccountsId;

	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:targetAccountId:index
	 */
	targetAccountId: AccountsId;

	/** Index: accountConnectionsIntentions:accountUser:userPair */
	userId: UsersId;

	createdAt: Date;
}

export interface AccountConnectionsIntentionsInitializer {
	/**
	 * Index: accountConnectionsIntentions:accountUser:userPair
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountId:index
	 */
	accountId: AccountsId;

	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:targetAccountId:index
	 */
	targetAccountId: AccountsId;

	/** Index: accountConnectionsIntentions:accountUser:userPair */
	userId: UsersId;

	createdAt: Date;
}

export interface AccountConnectionsIntentionsMutator {
	/**
	 * Index: accountConnectionsIntentions:accountUser:userPair
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountId:index
	 */
	accountId?: AccountsId;

	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:targetAccountId:index
	 */
	targetAccountId?: AccountsId;

	/** Index: accountConnectionsIntentions:accountUser:userPair */
	userId?: UsersId;

	createdAt?: Date;
}
