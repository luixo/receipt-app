// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";

import type { ReceiptsId } from "./receipts";
import type { UsersId } from "./users";

export default interface ReceiptParticipants {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	createdAt: Temporal.ZonedDateTime;

	updatedAt: Temporal.ZonedDateTime;
}

export interface ReceiptParticipantsInitializer {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
}

export interface ReceiptParticipantsMutator {
	/** Index: receiptParticipants:receiptId:index */
	receiptId?: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId?: UsersId;

	role?: string;

	createdAt?: Temporal.ZonedDateTime;

	updatedAt?: Temporal.ZonedDateTime;
}
