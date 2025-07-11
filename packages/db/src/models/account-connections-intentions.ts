// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";

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

	createdAt: Temporal.ZonedDateTime;

	updatedAt: Temporal.ZonedDateTime;
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

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
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

	createdAt?: Temporal.ZonedDateTime;

	updatedAt?: Temporal.ZonedDateTime;
}
