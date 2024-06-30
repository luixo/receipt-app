// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

export default interface AccountSettings {
	accountId: AccountsId;

	manualAcceptDebts: boolean;
}

export interface AccountSettingsInitializer {
	accountId: AccountsId;

	manualAcceptDebts: boolean;
}

export interface AccountSettingsMutator {
	accountId?: AccountsId;

	manualAcceptDebts?: boolean;
}
