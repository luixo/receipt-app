import React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { StoreDataContext } from "~app/contexts/store-data-context";
import { LIMIT_STORE_NAME } from "~app/utils/store/limit";
import { Divider } from "~components/divider";
import { Text } from "~components/text";
import { View } from "~components/view";

import { ColorModeSettings } from "./color-mode-settings";
import { LanguageSettings } from "./language-settings";
import { LimitOption } from "./limit-options";
import { ManualAcceptDebtsOption } from "./manual-accept-debts-option";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

export const SettingsScreen: React.FC = () => {
	const { t } = useTranslation("settings");
	const {
		[LIMIT_STORE_NAME]: [defaultLimit, onLimitChange],
	} = React.use(StoreDataContext);
	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			<LanguageSettings />
			<Divider />
			<ColorModeSettings />
			<Divider />
			<View className="flex-row gap-2">
				<Text>{t("showResolvedDebts.header")}</Text>
				<ShowResolvedDebtsOption />
			</View>
			<View className="flex-row gap-2">
				<Text>{t("manuallyAcceptDebts.header")}</Text>
				<ManualAcceptDebtsOption />
			</View>
			<View className="flex gap-2">
				<Text>{t("defaultLimit.header")}</Text>
				<LimitOption limit={defaultLimit} onChange={onLimitChange} />
			</View>
			<Divider />
			<RefreshSettings />
		</>
	);
};
