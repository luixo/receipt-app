// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from './accounts';

export default interface AccountConnections {
  /**
   * Primary key. Index: account_connections_pk
   * Index: account_links_firstaccountid_index
   */
  firstAccountId: AccountsId;

  /**
   * Primary key. Index: account_connections_pk
   * Index: account_links_secondaccountid_index
   */
  secondAccountId: AccountsId;

  firstStatus: string;

  secondStatus: string;
}

export interface AccountConnectionsInitializer {
  /**
   * Primary key. Index: account_connections_pk
   * Index: account_links_firstaccountid_index
   */
  firstAccountId: AccountsId;

  /**
   * Primary key. Index: account_connections_pk
   * Index: account_links_secondaccountid_index
   */
  secondAccountId: AccountsId;

  /** Default value: 'pending'::character varying */
  firstStatus?: string;

  /** Default value: 'pending'::character varying */
  secondStatus?: string;
}
