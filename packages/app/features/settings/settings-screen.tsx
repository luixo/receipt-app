import type React from "react";
import { View } from "react-native";

import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { Text } from "~components/text";

import { ColorModeSettings } from "./color-mode-settings";
import { ManualAcceptDebtsOption } from "./manual-accept-debts-option";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

export const SettingsScreen: React.FC = () => (
	<>
		<ColorModeSettings />
		<Divider />
		<Header size="lg">Settings</Header>
		<View className="flex-row gap-2">
			<Text>Show user with resolved debts</Text>
			<ShowResolvedDebtsOption />
		</View>
		<View className="flex-row gap-2">
			<Text>Manually accept debts</Text>
			<ManualAcceptDebtsOption />
		</View>
		<Divider />
		<RefreshSettings />
	</>
);
