// @generated
// Automatically generated. Don't change this file manually.

import { AccountsId } from "./accounts";

export type ReceiptsId = string & { " __flavor"?: "receipts" };

export default interface Receipts {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currency: string;

	created: Date;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Date;

	resolved: boolean;
}

export interface ReceiptsInitializer {
	/** Primary key. Index: receipts_pkey */
	id: ReceiptsId;

	name: string;

	currency: string;

	created: Date;

	/** Index: receipts:ownerAccountId:index */
	ownerAccountId: AccountsId;

	issued: Date;

	/** Default value: false */
	resolved?: boolean;
}
