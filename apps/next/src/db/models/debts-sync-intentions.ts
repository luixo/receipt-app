// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { DebtsId } from "./debts";

export default interface DebtsSyncIntentions {
	/**
	 * Index: debtsSyncIntentions:debtId:index
	 * Primary key. Index: debtsSyncIntentions:ownerAccountId:debtId:pair
	 */
	debtId: DebtsId;

	/**
	 * Primary key. Index: debtsSyncIntentions:ownerAccountId:debtId:pair
	 * Index: debtsSyncIntentions:ownerAccountId:index
	 */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}

export interface DebtsSyncIntentionsInitializer {
	/**
	 * Index: debtsSyncIntentions:debtId:index
	 * Primary key. Index: debtsSyncIntentions:ownerAccountId:debtId:pair
	 */
	debtId: DebtsId;

	/**
	 * Primary key. Index: debtsSyncIntentions:ownerAccountId:debtId:pair
	 * Index: debtsSyncIntentions:ownerAccountId:index
	 */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}
