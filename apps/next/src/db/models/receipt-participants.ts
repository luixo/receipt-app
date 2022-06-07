// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptsId } from './receipts';
import { UsersId } from './users';

export default interface ReceiptParticipants {
  /** Index: receipt_participants_receiptid_index */
  receiptId: ReceiptsId;

  /** Index: receipt_participants_userid_index */
  userId: UsersId;

  role: string;

  resolved: boolean;
}

export interface ReceiptParticipantsInitializer {
  /** Index: receipt_participants_receiptid_index */
  receiptId: ReceiptsId;

  /** Index: receipt_participants_userid_index */
  userId: UsersId;

  role: string;

  /** Default value: false */
  resolved?: boolean;
}
