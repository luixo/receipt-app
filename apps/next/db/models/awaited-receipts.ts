// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from './accounts';

export type AwaitedReceiptsId = string & { " __flavor"?: 'awaited_receipts' };

export default interface AwaitedReceipts {
  /** Index: receipts_accountid_index */
  accountId: AccountsId;

  /** Primary key. Index: receipts_pk */
  receiptId: AwaitedReceiptsId;

  name: string;

  fnsReceiptId: string;
}

export interface AwaitedReceiptsInitializer {
  /** Index: receipts_accountid_index */
  accountId: AccountsId;

  /** Primary key. Index: receipts_pk */
  receiptId: AwaitedReceiptsId;

  name: string;

  fnsReceiptId: string;
}
