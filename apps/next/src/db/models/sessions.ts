// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

export type SessionsId = string & { " __flavor"?: "sessions" };

export default interface Sessions {
	/**
	 * Primary key. Index: authorization_pk
	 * Index: authorization_sessionid_uindex
	 */
	sessionId: SessionsId;

	accountId: AccountsId;

	expirationTimestamp: Date;
}

export interface SessionsInitializer {
	/**
	 * Primary key. Index: authorization_pk
	 * Index: authorization_sessionid_uindex
	 */
	sessionId: SessionsId;

	accountId: AccountsId;

	expirationTimestamp: Date;
}
