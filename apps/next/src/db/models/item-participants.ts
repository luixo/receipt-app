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

	part: string;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId: UsersId;
}

export interface ItemParticipantsInitializer {
	/**
	 * Primary key. Index: itemParticipants:itemId-userId:primaryKey
	 * Index: itemParticipants:itemId:index
	 */
	itemId: ReceiptItemsId;

	part: string;

	/** Primary key. Index: itemParticipants:itemId-userId:primaryKey */
	userId: UsersId;
}
