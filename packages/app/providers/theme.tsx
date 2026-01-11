import React from "react";
import { useColorScheme } from "react-native";

import { useLastColorMode } from "~app/hooks/use-color-modes";

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const [, setLastColorMode] = useLastColorMode();
	const colorScheme = useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setLastColorMode(colorScheme);
	}, [colorScheme, setLastColorMode]);
	return <>{children}</>;
};
