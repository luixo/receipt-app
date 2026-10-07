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
		system: [systemColorMode, setSystemColorMode],
	} = useColorModes();
	const colorMode = selectedColorMode || systemColorMode;
	// Should be `useEffectEvent` in next React
	// oxlint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(() => applyColorMode(colorMode), [colorMode]);
	React.useEffect(() => {
		if (colorScheme === "unspecified") {
			return;
		}
		setSystemColorMode(colorScheme);
	}, [colorScheme, setSystemColorMode]);
	return <>{children}</>;
};
