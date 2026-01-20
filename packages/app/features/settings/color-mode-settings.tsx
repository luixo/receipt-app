import React from "react";

import { useTranslation } from "react-i18next";

import { useColorModes } from "~app/hooks/use-color-modes";
import { Checkbox } from "~components/checkbox";
import { Icon } from "~components/icons";
import { Switch } from "~components/switch";
import { Text } from "~components/text";
import { View } from "~components/view";

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
				isSelected={isSelected}
				onValueChange={setColorMode}
				thumbIcon={isSelected ? <Icon name="moon" /> : <Icon name="sun" />}
				isDisabled={selectedColorMode === undefined}
				size="lg"
				classNames={{ thumb: "bg-background", thumbIcon: "text-foreground" }}
			/>
		</View>
	);
};
