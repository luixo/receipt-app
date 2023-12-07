import React from "react";
import { View } from "react-native";

import { Divider } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import type { AppPage } from "next-app/types/page";

import { AutoAcceptDebtsOption } from "./auto-accept-debts-option";
import { ColorModeSettings } from "./color-mode-settings";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

export const SettingsScreen: AppPage = () => (
	<View className="items-center gap-4">
		<ColorModeSettings />
		<Divider />
		<Text className="text-4xl font-medium">Settings</Text>
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
	</View>
);
