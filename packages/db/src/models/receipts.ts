// @generated
// Automatically generated. Don't change this file manually.

import type { CurrencyCode } from "~app/utils/currency";

import type { AccountsId } from "./accounts";

/** Identifier type for "receipts" table */
export type ReceiptsId = string & { __flavor?: "receipts" };

export default interface Receipts {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currencyCode: CurrencyCode;

	createdAt: Date;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Date;

	transferIntentionAccountId: AccountsId | null;

	updatedAt: Date;
}

export interface ReceiptsInitializer {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currencyCode: CurrencyCode;

	createdAt: Date;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Date;

	transferIntentionAccountId?: AccountsId | null;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ReceiptsMutator {
	/** Primary key. Index: receipts_pkey */
	id?: ReceiptsId;

	name?: string;

	currencyCode?: CurrencyCode;

	createdAt?: Date;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId?: AccountsId;

	issued?: Date;

	transferIntentionAccountId?: AccountsId | null;

	updatedAt?: Date;
}
