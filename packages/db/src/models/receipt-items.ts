// @generated
// Automatically generated. Don't change this file manually.

import type { ReceiptsId } from "./receipts";

/** Identifier type for "receiptItems" table */
export type ReceiptItemsId = string & { __flavor?: "receiptItems" };

export default interface ReceiptItems {
	/** Primary key. Index: receipt_items_pkey */
	id: ReceiptItemsId;

	name: string;

	price: string;

	quantity: string;

	/** Index: receiptItems:receiptId:index */
	receiptId: ReceiptsId;

	createdAt: Date;

	updatedAt: Date;
}

export interface ReceiptItemsInitializer {
	/** Primary key. Index: receipt_items_pkey */
	id: ReceiptItemsId;

	name: string;

	price: string;

	quantity: string;

	/** Index: receiptItems:receiptId:index */
	receiptId: ReceiptsId;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ReceiptItemsMutator {
	/** Primary key. Index: receipt_items_pkey */
	id?: ReceiptItemsId;

	name?: string;

	price?: string;

	quantity?: string;

	/** Index: receiptItems:receiptId:index */
	receiptId?: ReceiptsId;

	createdAt?: Date;

	updatedAt?: Date;
}
