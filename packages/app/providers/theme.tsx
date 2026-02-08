import React from "react";
import { useColorScheme } from "react-native";

import { useColorModes } from "~app/hooks/use-color-modes";
import type { ColorMode } from "~app/utils/store/color-modes";

export const ThemeProvider: React.FC<
	React.PropsWithChildren<{
		applyColorMode: (colorMode: ColorMode) => void;
	}>
> = ({ children, applyColorMode }) => {
	const colorScheme = useColorScheme();
	const {
		selected: [selectedColorMode],
		last: [lastColorMode, setLastColorMode],
	} = useColorModes();
	const colorMode = selectedColorMode || lastColorMode;
	// Should be `useEffectEvent` in next React
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(() => applyColorMode(colorMode), [colorMode]);
	React.useEffect(() => {
		if (colorScheme === "unspecified") {
			return;
		}
		setLastColorMode(colorScheme);
	}, [colorScheme, setLastColorMode]);
	return <>{children}</>;
};
