import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { Divider } from "~components/divider";
import { Text } from "~components/text";

import { ColorModeSettings } from "./color-mode-settings";
import { DefaultLimitOption } from "./default-limit-option";
import { LanguageSettings } from "./language-settings";
import { ManualAcceptDebtsOption } from "./manual-accept-debts-option";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

export const SettingsScreen: React.FC = () => {
	const { t } = useTranslation("settings");
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
				<DefaultLimitOption />
			</View>
			<Divider />
			<RefreshSettings />
		</>
	);
};
