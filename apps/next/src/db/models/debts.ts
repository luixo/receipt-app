// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { ReceiptsId } from "./receipts";
import { UsersId } from "./users";

/** Identifier type for "debts" table */
export type DebtsId = string & { __flavor?: "debts" };

export default interface Debts {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: DebtsId;

	/**
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debts:ownerAccountId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId: AccountsId;

	/**
	 * Index: debts:userId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	userId: UsersId;

	currency: string;

	amount: string;

	timestamp: Date;

	created: Date;

	note: string;

	lockedTimestamp: Date | null;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId: ReceiptsId | null;
}

export interface DebtsInitializer {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: DebtsId;

	/**
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debts:ownerAccountId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId: AccountsId;

	/**
	 * Index: debts:userId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	userId: UsersId;

	currency: string;

	amount: string;

	timestamp: Date;

	created: Date;

	note: string;

	lockedTimestamp?: Date | null;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId?: ReceiptsId | null;
}

export interface DebtsMutator {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id?: DebtsId;

	/**
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debts:ownerAccountId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId?: AccountsId;

	/**
	 * Index: debts:userId:index
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	userId?: UsersId;

	currency?: string;

	amount?: string;

	timestamp?: Date;

	created?: Date;

	note?: string;

	lockedTimestamp?: Date | null;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId?: ReceiptsId | null;
}
