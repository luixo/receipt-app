import React from "react";
import { View } from "react-native";

import { Checkbox, Switch } from "@nextui-org/react";
import { FiMoon as MoonIcon, FiSun as SunIcon } from "react-icons/fi";

import { Header } from "app/components/base/header";
import { ColorModeContext } from "app/contexts/color-mode-context";

export const ColorModeSettings: React.FC = () => {
	const [colorModeConfig, setColorModeConfig] =
		React.useContext(ColorModeContext);
	const setColorMode = React.useCallback(
		(nextDark: boolean) => {
			setColorModeConfig((prevConfig) => ({
				...prevConfig,
				selected: nextDark ? "dark" : "light",
			}));
		},
		[setColorModeConfig],
	);
	const changeAuto = React.useCallback(
		(nextAuto: boolean) => {
			setColorModeConfig((prevConfig) =>
				nextAuto
					? {
							...prevConfig,
							selected: undefined,
					  }
					: {
							...prevConfig,
							selected: prevConfig.last,
					  },
			);
		},
		[setColorModeConfig],
	);
	const isSelected =
		colorModeConfig.selected === undefined
			? Boolean(colorModeConfig.last)
			: colorModeConfig.selected === "dark";
	return (
		<>
			<Header size="lg">Color mode</Header>
			<View className="flex-row gap-4">
				<Checkbox
					isSelected={colorModeConfig.selected === undefined}
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
					isDisabled={colorModeConfig.selected === undefined}
					size="lg"
					classNames={{ thumb: "bg-background" }}
				/>
			</View>
		</>
	);
};
