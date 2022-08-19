// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";
import { UsersId } from "./users";

export default interface Debts {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: string;

	/**
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debts:ownerAccountId:index
	 */
	ownerAccountId: AccountsId;

	/** Index: debts:userId:index */
	userId: UsersId;

	currency: string;

	amount: string;

	timestamp: Date;

	created: Date;

	note: string;
}

export interface DebtsInitializer {
	/** Primary key. Index: debts:ownerAccountId:debtId:pair */
	id: string;

	/**
	 * Primary key. Index: debts:ownerAccountId:debtId:pair
	 * Index: debts:ownerAccountId:index
	 */
	ownerAccountId: AccountsId;

	/** Index: debts:userId:index */
	userId: UsersId;

	currency: string;

	amount: string;

	timestamp: Date;

	created: Date;

	note: string;
}
