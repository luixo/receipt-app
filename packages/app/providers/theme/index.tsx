import React from "react";
import * as ReactNative from "react-native";

import { useLastColorModeCookie } from "app/hooks/use-color-modes";

export const ThemeProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [, setLastColorMode] = useLastColorModeCookie();
	const colorScheme = ReactNative.useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setLastColorMode(colorScheme);
	}, [colorScheme, setLastColorMode]);
	return <>{children}</>;
};
