// @generated
// Automatically generated. Don't change this file manually.

export type AccountsId = string & { " __flavor"?: "accounts" };

export default interface Accounts {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_email_uindex
	 * Index: accounts_pk
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;
}

export interface AccountsInitializer {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_email_uindex
	 * Index: accounts_pk
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;
}
