// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptsId } from "./receipts";
import { UsersId } from "./users";

export default interface ReceiptParticipants {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	resolved: boolean;
}

export interface ReceiptParticipantsInitializer {
	/** Index: receiptParticipants:receiptId:index */
	receiptId: ReceiptsId;

	/** Index: receiptParticipants:userId:index */
	userId: UsersId;

	role: string;

	/** Default value: false */
	resolved?: boolean;
}
