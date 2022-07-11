import React from "react";

import {
	ColorModeConfig,
	ColorModeContext,
} from "../contexts/color-mode-context";
import { ThemeProvider } from "../utils/styles";

import { NavigationProvider } from "./navigation";
import { QueriesProvider } from "./queries";

type Props = {
	initialColorModeConfig: ColorModeConfig;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	initialColorModeConfig,
}) => {
	const colorModeState = React.useState(initialColorModeConfig);
	return (
		<QueriesProvider>
			<ColorModeContext.Provider value={colorModeState}>
				<ThemeProvider>
					<NavigationProvider>{children}</NavigationProvider>
				</ThemeProvider>
			</ColorModeContext.Provider>
		</QueriesProvider>
	);
};
