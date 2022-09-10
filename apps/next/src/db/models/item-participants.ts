// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptItemsId } from "./receipt-items";
import { UsersId } from "./users";

export default interface ItemParticipants {
	/**
	 * Primary key. Index: itemParticipants:itemId-userId:primaryKey
	 * Index: itemParticipants:itemId:index
	 */
	itemId: ReceiptItemsId;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId: UsersId;

	part: string;
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
}
