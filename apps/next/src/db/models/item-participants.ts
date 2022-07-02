// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptItemsId } from "./receipt-items";
import { UsersId } from "./users";

export default interface ItemParticipants {
	/**
	 * Index: itemParticipants_itemId_index
	 * Primary key. Index: itemParticipants_pk
	 */
	itemId: ReceiptItemsId;

	part: string;

	/** Primary key. Index: itemParticipants_pk */
	userId: UsersId;
}

export interface ItemParticipantsInitializer {
	/**
	 * Index: itemParticipants_itemId_index
	 * Primary key. Index: itemParticipants_pk
	 */
	itemId: ReceiptItemsId;

	part: string;

	/** Primary key. Index: itemParticipants_pk */
	userId: UsersId;
}
