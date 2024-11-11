// @generated
// Automatically generated. Don't change this file manually.

import type { ReceiptItemsId } from "./receipt-items";
import type { UsersId } from "./users";

export default interface ReceiptItemConsumers {
	/**
	 * Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey
	 * Index: receiptItemConsumers:itemId:index
	 */
	itemId: ReceiptItemsId;

	/** Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey */
	userId: UsersId;

	part: string;

	createdAt: Date;

	updatedAt: Date;
}

export interface ReceiptItemConsumersInitializer {
	/**
	 * Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey
	 * Index: receiptItemConsumers:itemId:index
	 */
	itemId: ReceiptItemsId;

	/** Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey */
	userId: UsersId;

	part: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ReceiptItemConsumersMutator {
	/**
	 * Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey
	 * Index: receiptItemConsumers:itemId:index
	 */
	itemId?: ReceiptItemsId;

	/** Primary key. Index: receiptItemConsumers:itemId-userId:primaryKey */
	userId?: UsersId;

	part?: string;

	createdAt?: Date;

	updatedAt?: Date;
}
