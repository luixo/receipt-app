import React from "react";
import { View } from "react-native";

import {
	useLastColorModeCookie,
	useSelectedColorModeCookie,
} from "~app/hooks/use-color-modes";
import { Checkbox } from "~components/checkbox";
import { Header } from "~components/header";
import { MoonIcon, SunIcon } from "~components/icons";
import { Switch } from "~components/switch";

export const ColorModeSettings: React.FC = () => {
	const [lastColorMode] = useLastColorModeCookie();
	const [selectedColorMode, setSelectedColorMode, removeSelectedColorMode] =
		useSelectedColorModeCookie();
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
		<>
			<Header size="lg">Color mode</Header>
			<View className="flex-row gap-4">
				<Checkbox
					isSelected={selectedColorMode === undefined}
					onValueChange={changeAuto}
					size="lg"
				>
					Auto
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
		</>
	);
};
