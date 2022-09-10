import React from "react";

import { ExtraAppInitialProps } from "next/app";

import { ColorModeContext } from "app/contexts/color-mode-context";
import { ThemeProvider } from "app/utils/styles";

import { NavigationProvider } from "./navigation";
import { QueriesProvider } from "./queries";
import { StateProvider } from "./state";

type Props = ExtraAppInitialProps;

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	colorModeConfig,
	query,
}) => {
	const colorModeState = React.useState(colorModeConfig);
	return (
		<QueriesProvider>
			<StateProvider query={query}>
				<ColorModeContext.Provider value={colorModeState}>
					<ThemeProvider>
						<NavigationProvider>{children}</NavigationProvider>
					</ThemeProvider>
				</ColorModeContext.Provider>
			</StateProvider>
		</QueriesProvider>
	);
};
