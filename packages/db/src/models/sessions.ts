// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";

import type { AccountsId } from "./accounts";

/** Identifier type for "sessions" table */
export type SessionsSessionId = string & { __flavor?: "sessions" };

export default interface Sessions {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Temporal.ZonedDateTime;

	createdAt: Temporal.ZonedDateTime;
}

export interface SessionsInitializer {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId: AccountsId;

	expirationTimestamp: Temporal.ZonedDateTime;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;
}

export interface SessionsMutator {
	/** Primary key. Index: sessions_pkey */
	sessionId?: SessionsSessionId;

	/** Index: sessions:accountId:index */
	accountId?: AccountsId;

	expirationTimestamp?: Temporal.ZonedDateTime;

	createdAt?: Temporal.ZonedDateTime;
}
