// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

/** Identifier type for "users" table */
export type UsersId = string & { __flavor?: "users" };

export default interface Users {
	/** Primary key. Index: users_pkey */
	id: UsersId;

	name: string;

	publicName: string | null;

	/** Index: users:ownerAccountId:index */
	ownerAccountId: AccountsId;

	exposeReceipts: boolean;

	acceptReceipts: boolean;

	connectedAccountId: AccountsId | null;

	createdAt: Date;

	updatedAt: Date;
}

export interface UsersInitializer {
	/** Primary key. Index: users_pkey */
	id: UsersId;

	name: string;

	publicName?: string | null;

	/** Index: users:ownerAccountId:index */
	ownerAccountId: AccountsId;

	/** Default value: false */
	exposeReceipts?: boolean;

	/** Default value: false */
	acceptReceipts?: boolean;

	connectedAccountId?: AccountsId | null;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface UsersMutator {
	/** Primary key. Index: users_pkey */
	id?: UsersId;

	name?: string;

	publicName?: string | null;

	/** Index: users:ownerAccountId:index */
	ownerAccountId?: AccountsId;

	exposeReceipts?: boolean;

	acceptReceipts?: boolean;

	connectedAccountId?: AccountsId | null;

	createdAt?: Date;

	updatedAt?: Date;
}
