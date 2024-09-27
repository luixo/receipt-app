// @generated
// Automatically generated. Don't change this file manually.

import type { ReceiptItemsId } from "./receipt-items";
import type { UsersId } from "./users";

export default interface ItemParticipants {
	/**
	 * Primary key. Index: itemParticipants:itemId-userId:primaryKey
	 * Index: itemParticipants:itemId:index
	 */
	itemId: ReceiptItemsId;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId: UsersId;

	part: string;

	createdAt: Date;

	updatedAt: Date;
}

export interface ItemParticipantsInitializer {
	/**
	 * Primary key. Index: itemParticipants:itemId-userId:primaryKey
	 * Index: itemParticipants:itemId:index
	 */
	itemId: ReceiptItemsId;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId: UsersId;

	part: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ItemParticipantsMutator {
	/**
	 * Primary key. Index: itemParticipants:itemId-userId:primaryKey
	 * Index: itemParticipants:itemId:index
	 */
	itemId?: ReceiptItemsId;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId?: UsersId;

	part?: string;

	createdAt?: Date;

	updatedAt?: Date;
}
