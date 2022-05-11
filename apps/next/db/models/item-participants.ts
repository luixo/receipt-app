// @generated
// Automatically generated. Don't change this file manually.

import { ReceiptItemsId } from './receipt-items';
import { UsersId } from './users';

export default interface ItemParticipants {
  /**
   * Index: item_participants_itemid_index
   * Primary key. Index: item_participants_pk
   */
  itemId: ReceiptItemsId;

  part: string;

  /** Primary key. Index: item_participants_pk */
  userId: UsersId;
}

export interface ItemParticipantsInitializer {
  /**
   * Index: item_participants_itemid_index
   * Primary key. Index: item_participants_pk
   */
  itemId: ReceiptItemsId;

  part: string;

  /** Primary key. Index: item_participants_pk */
  userId: UsersId;
}
