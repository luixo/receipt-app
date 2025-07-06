import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { SuspenseWrapper } from "~app/components/suspense-wrapper";
import { Divider } from "~components/divider";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

import { ColorModeSettings } from "./color-mode-settings";
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
				<SuspenseWrapper fallback={<Spinner />}>
					<ManualAcceptDebtsOption />
				</SuspenseWrapper>
			</View>
			<Divider />
			<RefreshSettings />
		</>
	);
};
