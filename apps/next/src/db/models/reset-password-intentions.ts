// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

export default interface ResetPasswordIntentions {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Date;

	token: string;
}

export interface ResetPasswordIntentionsInitializer {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Date;

	token: string;
}

export interface ResetPasswordIntentionsMutator {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId?: AccountsId;

	expiresTimestamp?: Date;

	token?: string;
}
