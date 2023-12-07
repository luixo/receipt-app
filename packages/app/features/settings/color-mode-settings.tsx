import React from "react";
import { View } from "react-native";

import { Checkbox, Switch } from "@nextui-org/react-tailwind";
import { FiMoon as MoonIcon, FiSun as SunIcon } from "react-icons/fi";

import { Text } from "app/components/base/text";
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
		<View className="gap-4">
			<Text className="text-4xl font-medium">Color mode</Text>
			<View className="flex-row justify-evenly gap-2">
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
		</View>
	);
};
