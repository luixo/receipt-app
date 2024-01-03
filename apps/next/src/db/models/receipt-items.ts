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

	locked: boolean | null;

	created: Date;
}

export interface ReceiptItemsInitializer {
	/** Primary key. Index: receipt_items_pkey */
	id: ReceiptItemsId;

	name: string;

	price: string;

	quantity: string;

	/** Index: receiptItems:receiptId:index */
	receiptId: ReceiptsId;

	/** Default value: false */
	locked?: boolean | null;

	/** Default value: now() */
	created?: Date;
}

export interface ReceiptItemsMutator {
	/** Primary key. Index: receipt_items_pkey */
	id?: ReceiptItemsId;

	name?: string;

	price?: string;

	quantity?: string;

	/** Index: receiptItems:receiptId:index */
	receiptId?: ReceiptsId;

	locked?: boolean | null;

	created?: Date;
}
