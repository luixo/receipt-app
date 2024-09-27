// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

export default interface ResetPasswordIntentions {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Date;

	token: string;

	createdAt: Date;

	updatedAt: Date;
}

export interface ResetPasswordIntentionsInitializer {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Date;

	token: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Date;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface ResetPasswordIntentionsMutator {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId?: AccountsId;

	expiresTimestamp?: Date;

	token?: string;

	createdAt?: Date;

	updatedAt?: Date;
}
