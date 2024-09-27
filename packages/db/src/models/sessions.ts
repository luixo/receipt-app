// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

/** Identifier type for "sessions" table */
export type SessionsSessionId = string & { __flavor?: "sessions" };

export default interface Sessions {
	/** Primary key. Index: authorization_pk */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;

	createdAt: Date;
}

export interface SessionsInitializer {
	/** Primary key. Index: authorization_pk */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;
}

export interface SessionsMutator {
	/** Primary key. Index: authorization_pk */
	sessionId?: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId?: AccountsId;

	expirationTimestamp?: Date;

	createdAt?: Date;
}
