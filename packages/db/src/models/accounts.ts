// @generated
// Automatically generated. Don't change this file manually.

/** Identifier type for "accounts" table */
export type AccountsId = string & { __flavor?: "accounts" };

export default interface Accounts {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_pk
	 * Index: accounts:email:index
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken: string | null;

	confirmationTokenTimestamp: Date | null;

	avatarUrl: string | null;

	role: string | null;

	createdAt: Date;

	updatedAt: Date;
}

export interface AccountsInitializer {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_pk
	 * Index: accounts:email:index
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken?: string | null;

	confirmationTokenTimestamp?: Date | null;

	avatarUrl?: string | null;

	role?: string | null;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface AccountsMutator {
	/** Primary key. Index: accounts_pkey */
	id?: AccountsId;

	/**
	 * Index: accounts_pk
	 * Index: accounts:email:index
	 */
	email?: string;

	passwordHash?: string;

	passwordSalt?: string;

	confirmationToken?: string | null;

	confirmationTokenTimestamp?: Date | null;

	avatarUrl?: string | null;

	role?: string | null;

	createdAt?: Date;

	updatedAt?: Date;
}
