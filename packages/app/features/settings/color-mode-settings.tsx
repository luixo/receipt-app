import React from "react";

import { useTranslation } from "react-i18next";

import { useColorModes } from "#app/hooks/use-color-modes.ts";
import { Checkbox } from "#components/checkbox.tsx";
import { Icon } from "#components/icons.tsx";
import { Switch } from "#components/switch.tsx";
import { Text } from "#components/text.tsx";
import { View } from "#components/view.tsx";

export const ColorModeSettings: React.FC = () => {
	const { t } = useTranslation("settings");
	const {
		last: [lastColorMode],
		selected: [
			selectedColorMode,
			setSelectedColorMode,
			removeSelectedColorMode,
		],
	} = useColorModes();
	const setColorMode = React.useCallback(
		(nextDark: boolean) => setSelectedColorMode(nextDark ? "dark" : "light"),
		[setSelectedColorMode],
	);
	const changeAuto = React.useCallback(
		(nextAuto: boolean) => {
			if (nextAuto) {
				removeSelectedColorMode();
			} else {
				setSelectedColorMode(lastColorMode);
			}
		},
		[removeSelectedColorMode, setSelectedColorMode, lastColorMode],
	);
	const isSelected =
		selectedColorMode === undefined
			? Boolean(lastColorMode)
			: selectedColorMode === "dark";
	return (
		<View className="flex-row items-center gap-4">
			<Text className="text-xl">{t("colorMode.header")}</Text>
			<Checkbox
				isSelected={selectedColorMode === undefined}
				onValueChange={changeAuto}
				size="lg"
			>
				{t("colorMode.autoCheckbox")}
			</Checkbox>
			<Switch
				testID="color-mode-switch"
				isSelected={isSelected}
				onValueChange={setColorMode}
				thumbIcon={
					<Icon
						name={isSelected ? "moon" : "sun"}
						className="text-foreground"
					/>
				}
				isDisabled={selectedColorMode === undefined}
				size="lg"
				thumbClassName="bg-background"
			/>
		</View>
	);
};
