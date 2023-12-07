import React from "react";
import { View } from "react-native";

import { Divider } from "@nextui-org/react-tailwind";

import { Header } from "app/components/base/header";
import { Text } from "app/components/base/text";
import type { AppPage } from "next-app/types/page";

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
