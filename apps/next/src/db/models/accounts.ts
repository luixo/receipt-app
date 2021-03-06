// @generated
// Automatically generated. Don't change this file manually.

export type AccountsId = string & { " __flavor"?: "accounts" };

export default interface Accounts {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts:email:index
	 * Index: accounts_email_key
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken: string | null;

	confirmationTokenTimestamp: Date | null;
}

export interface AccountsInitializer {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts:email:index
	 * Index: accounts_email_key
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken?: string | null;

	confirmationTokenTimestamp?: Date | null;
}
