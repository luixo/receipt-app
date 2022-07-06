// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

export type SessionsId = string & { " __flavor"?: "sessions" };

export default interface Sessions {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsId;

	/** Index: sessions:sessionId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;
}

export interface SessionsInitializer {
	/** Primary key. Index: sessions_pkey */
	sessionId: SessionsId;

	/** Index: sessions:sessionId:index */
	accountId: AccountsId;

	expirationTimestamp: Date;
}
