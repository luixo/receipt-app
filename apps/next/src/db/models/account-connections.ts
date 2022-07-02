// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

export default interface AccountConnections {
	/**
	 * Primary key. Index: account_connections_pair
	 * Index: accountLinks_firstAccountId_index
	 */
	firstAccountId: AccountsId;

	/**
	 * Primary key. Index: account_connections_pair
	 * Index: accountLinks_secondAccountId_index
	 */
	secondAccountId: AccountsId;

	firstStatus: string;

	secondStatus: string;
}

export interface AccountConnectionsInitializer {
	/**
	 * Primary key. Index: account_connections_pair
	 * Index: accountLinks_firstAccountId_index
	 */
	firstAccountId: AccountsId;

	/**
	 * Primary key. Index: account_connections_pair
	 * Index: accountLinks_secondAccountId_index
	 */
	secondAccountId: AccountsId;

	/** Default value: 'pending'::character varying */
	firstStatus?: string;

	/** Default value: 'pending'::character varying */
	secondStatus?: string;
}
