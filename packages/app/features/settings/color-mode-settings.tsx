import React from "react";

import type { SwitchEvent } from "@nextui-org/react";
import { Checkbox, Switch, styled } from "@nextui-org/react";
import { Spacer } from "@nextui-org/react-tailwind";
import { FiMoon as MoonIcon, FiSun as SunIcon } from "react-icons/fi";

import { Text } from "app/components/base/text";
import { ColorModeContext } from "app/contexts/color-mode-context";

const Wrapper = styled("div", {
	width: "100%",
	display: "flex",
	justifyContent: "space-evenly",
});

export const ColorModeSettings: React.FC = () => {
	const [colorModeConfig, setColorModeConfig] =
		React.useContext(ColorModeContext);
	const setColorMode = React.useCallback(
		(e: SwitchEvent) => {
			setColorModeConfig((prevConfig) => ({
				...prevConfig,
				selected: e.target.checked ? "dark" : "light",
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
	return (
		<>
			<Text className="text-4xl font-medium">Color mode</Text>
			<Spacer y={4} />
			<Wrapper>
				<Checkbox
					isSelected={colorModeConfig.selected === undefined}
					onChange={changeAuto}
					label="Auto"
					size="lg"
				/>
				<Switch
					checked={
						colorModeConfig.selected === undefined
							? Boolean(colorModeConfig.last)
							: colorModeConfig.selected === "dark"
					}
					onChange={setColorMode}
					disabled={colorModeConfig.selected === undefined}
					iconOn={<MoonIcon />}
					iconOff={<SunIcon />}
					bordered
					size="lg"
				/>
			</Wrapper>
		</>
	);
};
