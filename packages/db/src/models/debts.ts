// @generated
// Automatically generated. Don't change this file manually.

import type { CurrencyCode } from "~app/utils/currency";

import type { AccountsId } from "./accounts";
import type { ReceiptsId } from "./receipts";
import type { UsersId } from "./users";

/** Identifier type for "debts" table */
export type DebtsId = string & { __flavor?: "debts" };

export default interface Debts {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: DebtsId;

	/**
	 * Index: debts:ownerAccountId:index
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId: AccountsId;

	/**
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 * Index: debts:userId:index
	 */
	userId: UsersId;

	currencyCode: CurrencyCode;

	amount: string;

	timestamp: Date;

	createdAt: Date;

	note: string;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId: ReceiptsId | null;

	updatedAt: Date;
}

export interface DebtsInitializer {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: DebtsId;

	/**
	 * Index: debts:ownerAccountId:index
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId: AccountsId;

	/**
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 * Index: debts:userId:index
	 */
	userId: UsersId;

	currencyCode: CurrencyCode;

	amount: string;

	timestamp: Date;

	createdAt: Date;

	note: string;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId?: ReceiptsId | null;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface DebtsMutator {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id?: DebtsId;

	/**
	 * Index: debts:ownerAccountId:index
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 */
	ownerAccountId?: AccountsId;

	/**
	 * Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple
	 * Index: debts:userId:index
	 */
	userId?: UsersId;

	currencyCode?: CurrencyCode;

	amount?: string;

	timestamp?: Date;

	createdAt?: Date;

	note?: string;

	/** Index: debtsSyncIntentions:ownerAccountId:receiptId:userId:tuple */
	receiptId?: ReceiptsId | null;

	updatedAt?: Date;
}
