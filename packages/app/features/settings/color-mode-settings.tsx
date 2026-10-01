import React from "react";

import { useTranslation } from "react-i18next";

import { useColorModes } from "~app/hooks/use-color-modes";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { View } from "~components/view";

export const ColorModeSettings: React.FC = () => {
	const { t } = useTranslation("settings");
	const {
		system: [systemColorMode],
		selected: [
			selectedColorMode,
			setSelectedColorMode,
			removeSelectedColorMode,
		],
	} = useColorModes();
	const switchColorMode = React.useEffectEvent(() => {
		if (!selectedColorMode || selectedColorMode === systemColorMode) {
			setSelectedColorMode(systemColorMode === "dark" ? "light" : "dark");
		} else {
			removeSelectedColorMode();
		}
	});
	const colorMode = selectedColorMode ?? systemColorMode;
	return (
		<View className="flex-row items-center gap-4">
			<Text className="text-xl">{t("colorMode.header")}</Text>
			<Button
				testID="color-mode-button"
				isIconOnly
				variant="bordered"
				onPress={switchColorMode}
			>
				<Icon
					name={colorMode === "light" ? "moon" : "sun"}
					className="text-foreground"
				/>
			</Button>
		</View>
	);
};
