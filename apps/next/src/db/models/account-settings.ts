// @generated
// Automatically generated. Don't change this file manually.

import type { AccountsId } from "./accounts";

export default interface AccountSettings {
	accountId: AccountsId;

	autoAcceptDebts: boolean;
}

export interface AccountSettingsInitializer {
	accountId: AccountsId;

	autoAcceptDebts: boolean;
}

export interface AccountSettingsMutator {
	accountId?: AccountsId;

	autoAcceptDebts?: boolean;
}
