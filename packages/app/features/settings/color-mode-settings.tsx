import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import {
	useLastColorMode,
	useSelectedColorMode,
} from "~app/hooks/use-color-modes";
import { Checkbox } from "~components/checkbox";
import { MoonIcon, SunIcon } from "~components/icons";
import { Switch } from "~components/switch";
import { Text } from "~components/text";

export const ColorModeSettings: React.FC = () => {
	const { t } = useTranslation("settings");
	const [lastColorMode] = useLastColorMode();
	const [selectedColorMode, setSelectedColorMode, removeSelectedColorMode] =
		useSelectedColorMode();
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
				isSelected={isSelected}
				onValueChange={setColorMode}
				thumbIcon={
					isSelected ? (
						<MoonIcon color="currentColor" />
					) : (
						<SunIcon color="currentColor" />
					)
				}
				isDisabled={selectedColorMode === undefined}
				size="lg"
				classNames={{ thumb: "bg-background" }}
			/>
		</View>
	);
};
