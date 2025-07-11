// @generated
// Automatically generated. Don't change this file manually.

import type { Temporal } from "~utils/date";

import type { AccountsId } from "./accounts";

export default interface AccountSettings {
	accountId: AccountsId;

	manualAcceptDebts: boolean;

	updatedAt: Temporal.ZonedDateTime;
}

export interface AccountSettingsInitializer {
	accountId: AccountsId;

	manualAcceptDebts: boolean;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Temporal.ZonedDateTime;
}

export interface AccountSettingsMutator {
	accountId?: AccountsId;

	manualAcceptDebts?: boolean;

	updatedAt?: Temporal.ZonedDateTime;
}
