// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { UsersId } from "./users";

export default interface AccountConnectionsIntentions {
	/**
	 * Index: accountConnectionsIntentions:accountId:index
	 * Index: accountConnectionsIntentions:accountUser:userPair
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 */
	accountId: AccountsId;

	/** Index: accountConnectionsIntentions:accountUser:userPair */
	userId: UsersId;

	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:targetAccountId:index
	 */
	targetAccountId: AccountsId;

	created: Date;
}

export interface AccountConnectionsIntentionsInitializer {
	/**
	 * Index: accountConnectionsIntentions:accountId:index
	 * Index: accountConnectionsIntentions:accountUser:userPair
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 */
	accountId: AccountsId;

	/** Index: accountConnectionsIntentions:accountUser:userPair */
	userId: UsersId;

	/**
	 * Primary key. Index: accountConnectionsIntentions:accounts:accountPair
	 * Index: accountConnectionsIntentions:targetAccountId:index
	 */
	targetAccountId: AccountsId;

	created: Date;
}
