import React from "react";

import {
	Checkbox,
	Spacer,
	styled,
	Switch,
	SwitchEvent,
	Text,
} from "@nextui-org/react";
import { FiSun as SunIcon, FiMoon as MoonIcon } from "react-icons/fi";

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
			<Text h2>Color mode</Text>
			<Spacer y={1} />
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
