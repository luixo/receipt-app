// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { UsersId } from "./users";

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

	created: Date;
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

	created: Date;
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

	created?: Date;
}
