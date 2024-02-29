import React from "react";
import { View } from "react-native";

import { Divider, Header, Text } from "~components";
import type { AppPage } from "~web/types/page";

import { AutoAcceptDebtsOption } from "./auto-accept-debts-option";
import { ColorModeSettings } from "./color-mode-settings";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

export const SettingsScreen: AppPage = () => (
	<>
		<ColorModeSettings />
		<Divider />
		<Header size="lg">Settings</Header>
		<View className="flex-row gap-2">
			<Text>Show user with resolved debts</Text>
			<ShowResolvedDebtsOption />
		</View>
		<View className="flex-row gap-2">
			<Text>Auto-accept debts</Text>
			<AutoAcceptDebtsOption />
		</View>
		<Divider />
		<RefreshSettings />
	</>
);
