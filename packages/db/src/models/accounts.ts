// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";
/** Identifier type for "accounts" table */
export type AccountsId = string & { __flavor?: "accounts" };

export default interface Accounts {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_email_key
	 * Index: accounts:email:index
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken: string | null;

	confirmationTokenTimestamp: Temporal.ZonedDateTime | null;

	avatarUrl: string | null;

	role: string | null;

	createdAt: Temporal.ZonedDateTime;

	updatedAt: Temporal.ZonedDateTime;
}

export interface AccountsInitializer {
	/** Primary key. Index: accounts_pkey */
	id: AccountsId;

	/**
	 * Index: accounts_email_key
	 * Index: accounts:email:index
	 */
	email: string;

	passwordHash: string;

	passwordSalt: string;

	confirmationToken?: string | null;

	confirmationTokenTimestamp?: Temporal.ZonedDateTime | null;

	avatarUrl?: string | null;

	role?: string | null;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
}

export interface AccountsMutator {
	/** Primary key. Index: accounts_pkey */
	id?: AccountsId;

	/**
	 * Index: accounts_email_key
	 * Index: accounts:email:index
	 */
	email?: string;

	passwordHash?: string;

	passwordSalt?: string;

	confirmationToken?: string | null;

	confirmationTokenTimestamp?: Temporal.ZonedDateTime | null;

	avatarUrl?: string | null;

	role?: string | null;

	createdAt?: Temporal.ZonedDateTime;

	updatedAt?: Temporal.ZonedDateTime;
}
