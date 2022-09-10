// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

/** Identifier type for "sessions" table */
export type SessionsSessionId = string & { __flavor?: "sessions" };

export default interface Sessions {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;
}

export interface SessionsInitializer {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;
}

export interface SessionsMutator {
	/** Primary key. Index: sessions_pkey */
	sessionId?: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId?: AccountsId;

	expirationTimestamp?: Date;
}
