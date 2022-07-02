// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptsId } from "./receipts";

export type ReceiptItemsId = string & { " __flavor"?: "receipt_items" };

export default interface ReceiptItems {
	/** Primary key. Index: receipt_items_pkey */
	id: ReceiptItemsId;

	name: string;

	price: string;

	quantity: string;

	/** Index: receiptItems_receiptId_index */
	receiptId: ReceiptsId;

	locked: boolean;
}

export interface ReceiptItemsInitializer {
	/** Primary key. Index: receipt_items_pkey */
	id: ReceiptItemsId;

	name: string;

	price: string;

	quantity: string;

	/** Index: receiptItems_receiptId_index */
	receiptId: ReceiptsId;

	/** Default value: false */
	locked?: boolean;
}
