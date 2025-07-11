// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";

import type { AccountsId } from "./accounts";

export default interface ResetPasswordIntentions {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Temporal.ZonedDateTime;

	token: string;

	createdAt: Temporal.ZonedDateTime;

	updatedAt: Temporal.ZonedDateTime;
}

export interface ResetPasswordIntentionsInitializer {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId: AccountsId;

	expiresTimestamp: Temporal.ZonedDateTime;

	token: string;

	/** Default value: CURRENT_TIMESTAMP */
	createdAt?: Temporal.ZonedDateTime;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
}

export interface ResetPasswordIntentionsMutator {
	/** Index: resetPasswordIntentions:accountId:index */
	accountId?: AccountsId;

	expiresTimestamp?: Temporal.ZonedDateTime;

	token?: string;

	createdAt?: Temporal.ZonedDateTime;

	updatedAt?: Temporal.ZonedDateTime;
}
