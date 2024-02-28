import React from "react";
import { View } from "react-native";

import { Checkbox, Switch } from "@nextui-org/react";
import { FiMoon as MoonIcon, FiSun as SunIcon } from "react-icons/fi";

import {
	useLastColorModeCookie,
	useSelectedColorModeCookie,
} from "~app/hooks/use-color-modes";
import { Header } from "~components";

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
