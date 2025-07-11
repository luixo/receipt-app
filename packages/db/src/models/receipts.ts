// @generated
// Automatically generated. Don't change this file manually.

import type { CurrencyCode } from "~app/utils/currency";
import type { Temporal } from "~utils/date";

import type { AccountsId } from "./accounts";

/** Identifier type for "receipts" table */
export type ReceiptsId = string & { __flavor?: "receipts" };

export default interface Receipts {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currencyCode: CurrencyCode;

	createdAt: Temporal.ZonedDateTime;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Temporal.PlainDate;

	updatedAt: Temporal.ZonedDateTime;
}

export interface ReceiptsInitializer {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currencyCode: CurrencyCode;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Temporal.PlainDate;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
}

export interface ReceiptsMutator {
	/** Primary key. Index: receipts_pkey */
	id?: ReceiptsId;

	name?: string;

	currencyCode?: CurrencyCode;

	createdAt?: Temporal.ZonedDateTime;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId?: AccountsId;

	issued?: Temporal.PlainDate;

	updatedAt?: Temporal.ZonedDateTime;
}
