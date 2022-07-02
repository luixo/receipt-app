// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

export type SessionsId = string & { " __flavor"?: "sessions" };

export default interface Sessions {
	/**
	 * Primary key. Index: sessions_pkey
	 * Index: sessions_sessionId_index
	 */
	sessionId: SessionsId;

	accountId: AccountsId;

	expirationTimestamp: Date;
}

export interface SessionsInitializer {
	/**
	 * Primary key. Index: sessions_pkey
	 * Index: sessions_sessionId_index
	 */
	sessionId: SessionsId;

	accountId: AccountsId;

	expirationTimestamp: Date;
}
