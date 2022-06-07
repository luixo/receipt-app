// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from './accounts';

export type UsersId = string & { " __flavor"?: 'users' };

export default interface Users {
  /** Primary key. Index: users_pkey */
  id: UsersId;

  name: string;

  ownerAccountId: AccountsId;

  publicName: string;

  exposeReceipts: boolean;

  acceptReceipts: boolean;

  connectedAccountId: AccountsId | null;
}

export interface UsersInitializer {
  /** Primary key. Index: users_pkey */
  id: UsersId;

  name: string;

  ownerAccountId: AccountsId;

  publicName: string;

  /** Default value: false */
  exposeReceipts?: boolean;

  /** Default value: false */
  acceptReceipts?: boolean;

  connectedAccountId?: AccountsId | null;
}
