// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";
import type { UsersId } from "./users";

export default interface AccountConnectionsIntentions {
	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountUser:userPair
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

	updatedAt: Date;
}

export interface AccountConnectionsIntentionsInitializer {
	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountUser:userPair
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

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface AccountConnectionsIntentionsMutator {
	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:accountUser:userPair
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

	updatedAt?: Date;
}
