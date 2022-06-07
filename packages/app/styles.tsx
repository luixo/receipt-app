import React from "react";
import * as ReactNative from "react-native";
import { makeTheme, styled, DripsyProvider } from "dripsy";
import { ColorModeContext } from "./contexts/color-mode-context";

const theme = makeTheme({});

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	const [, setColorModeConfig] = React.useContext(ColorModeContext);
	const colorScheme = ReactNative.useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setColorModeConfig((prev) => ({ ...prev, last: colorScheme }));
	}, [colorScheme]);
	return <DripsyProvider theme={theme}>{children}</DripsyProvider>;
};

export { styled };
