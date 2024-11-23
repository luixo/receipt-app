import React from "react";
import * as ReactNative from "react-native";

import { useLastColorMode } from "~app/hooks/use-color-modes";

export const ThemeProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [, setLastColorMode] = useLastColorMode();
	const colorScheme = ReactNative.useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setLastColorMode(colorScheme);
	}, [colorScheme, setLastColorMode]);
	return <>{children}</>;
};
