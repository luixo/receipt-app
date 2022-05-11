// @generated
// Automatically generated. Don't change this file manually.

import AccountConnections, { AccountConnectionsInitializer } from './account-connections';
import Accounts, { AccountsInitializer, AccountsId } from './accounts';
import AwaitedReceipts, { AwaitedReceiptsInitializer, AwaitedReceiptsId } from './awaited-receipts';
import ItemParticipants, { ItemParticipantsInitializer } from './item-participants';
import ReceiptItems, { ReceiptItemsInitializer, ReceiptItemsId } from './receipt-items';
import ReceiptParticipants, { ReceiptParticipantsInitializer } from './receipt-participants';
import Receipts, { ReceiptsInitializer, ReceiptsId } from './receipts';
import Sessions, { SessionsInitializer, SessionsId } from './sessions';
import Users, { UsersInitializer, UsersId } from './users';

type Model =
  | AccountConnections
  | Accounts
  | AwaitedReceipts
  | ItemParticipants
  | ReceiptItems
  | ReceiptParticipants
  | Receipts
  | Sessions
  | Users

interface ModelTypeMap {
  'account_connections': AccountConnections;
  'accounts': Accounts;
  'awaited_receipts': AwaitedReceipts;
  'item_participants': ItemParticipants;
  'receipt_items': ReceiptItems;
  'receipt_participants': ReceiptParticipants;
  'receipts': Receipts;
  'sessions': Sessions;
  'users': Users;
}

type ModelId =
  | AccountsId
  | AwaitedReceiptsId
  | ReceiptItemsId
  | ReceiptsId
  | SessionsId
  | UsersId

interface ModelIdTypeMap {
  'accounts': AccountsId;
  'awaited_receipts': AwaitedReceiptsId;
  'receipt_items': ReceiptItemsId;
  'receipts': ReceiptsId;
  'sessions': SessionsId;
  'users': UsersId;
}

type Initializer =
  | AccountConnectionsInitializer
  | AccountsInitializer
  | AwaitedReceiptsInitializer
  | ItemParticipantsInitializer
  | ReceiptItemsInitializer
  | ReceiptParticipantsInitializer
  | ReceiptsInitializer
  | SessionsInitializer
  | UsersInitializer

interface InitializerTypeMap {
  'account_connections': AccountConnectionsInitializer;
  'accounts': AccountsInitializer;
  'awaited_receipts': AwaitedReceiptsInitializer;
  'item_participants': ItemParticipantsInitializer;
  'receipt_items': ReceiptItemsInitializer;
  'receipt_participants': ReceiptParticipantsInitializer;
  'receipts': ReceiptsInitializer;
  'sessions': SessionsInitializer;
  'users': UsersInitializer;
}

export type {
  AccountConnections, AccountConnectionsInitializer,
  Accounts, AccountsInitializer, AccountsId,
  AwaitedReceipts, AwaitedReceiptsInitializer, AwaitedReceiptsId,
  ItemParticipants, ItemParticipantsInitializer,
  ReceiptItems, ReceiptItemsInitializer, ReceiptItemsId,
  ReceiptParticipants, ReceiptParticipantsInitializer,
  Receipts, ReceiptsInitializer, ReceiptsId,
  Sessions, SessionsInitializer, SessionsId,
  Users, UsersInitializer, UsersId,

  Model,
  ModelTypeMap,
  ModelId,
  ModelIdTypeMap,
  Initializer,
  InitializerTypeMap
};
