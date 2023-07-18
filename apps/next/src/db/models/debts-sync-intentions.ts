// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";
import type { DebtsId } from "./debts";

export default interface DebtsSyncIntentions {
	/**
	 * Index: debtsSyncIntentions_debtId_key
	 * Index: debtsSyncIntentions:debtId:index
	 */
	debtId: DebtsId;

	/** Index: debtsSyncIntentions:ownerAccountId:index */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}

export interface DebtsSyncIntentionsInitializer {
	/**
	 * Index: debtsSyncIntentions_debtId_key
	 * Index: debtsSyncIntentions:debtId:index
	 */
	debtId: DebtsId;

	/** Index: debtsSyncIntentions:ownerAccountId:index */
	ownerAccountId: AccountsId;

	lockedTimestamp: Date;
}

export interface DebtsSyncIntentionsMutator {
	/**
	 * Index: debtsSyncIntentions_debtId_key
	 * Index: debtsSyncIntentions:debtId:index
	 */
	debtId?: DebtsId;

	/** Index: debtsSyncIntentions:ownerAccountId:index */
	ownerAccountId?: AccountsId;

	lockedTimestamp?: Date;
}
