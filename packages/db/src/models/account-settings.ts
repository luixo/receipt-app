// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

export default interface AccountSettings {
	accountId: AccountsId;

	manualAcceptDebts: boolean;

	updatedAt: Date;
}

export interface AccountSettingsInitializer {
	accountId: AccountsId;

	manualAcceptDebts: boolean;

	/** Default value: CURRENT_TIMESTAMP */
	updatedAt?: Date;
}

export interface AccountSettingsMutator {
	accountId?: AccountsId;

	manualAcceptDebts?: boolean;

	updatedAt?: Date;
}
