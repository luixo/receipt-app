// @generated
// Automatically generated. Don't change this file manually.

import type { ReceiptsId } from "./receipts";
import type { UsersId } from "./users";

export default interface ReceiptParticipants {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	createdAt: Date;

	updatedAt: Date;
}

export interface ReceiptParticipantsInitializer {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ReceiptParticipantsMutator {
	/** Index: receiptParticipants:receiptId:index */
	receiptId?: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId?: UsersId;

	role?: string;

	createdAt?: Date;

	updatedAt?: Date;
}
