// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { DebtsId } from "./debts";

export default interface DebtsSyncIntentions {
	/**
	 * Index: debtsSyncIntentions:debtId:index
	 * Index: debtsSyncIntentions_debtId_key
	 */
	debtId: DebtsId;

	/** Index: debtsSyncIntentions:ownerAccountId:index */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}

export interface DebtsSyncIntentionsInitializer {
	/**
	 * Index: debtsSyncIntentions:debtId:index
	 * Index: debtsSyncIntentions_debtId_key
	 */
	debtId: DebtsId;

	/** Index: debtsSyncIntentions:ownerAccountId:index */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}
