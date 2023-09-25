import React from "react";

import type { ExtraAppInitialProps } from "next/app";

import { ColorModeContext } from "app/contexts/color-mode-context";
import { SettingsContext } from "app/contexts/settings-context";
import { ThemeProvider } from "app/utils/styles";

import { NavigationProvider } from "./navigation";
import { QueriesProvider } from "./queries";
import { SSRProvider } from "./ssr";
import { StateProvider } from "./state";

type Props = ExtraAppInitialProps;

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	colorModeConfig,
	settings,
	query,
	ssrContext,
}) => {
	const colorModeState = React.useState(colorModeConfig);
	const settingsState = React.useState(settings);
	return (
		<QueriesProvider>
			<StateProvider query={query}>
				<ColorModeContext.Provider value={colorModeState}>
					<SettingsContext.Provider value={settingsState}>
						<SSRProvider {...ssrContext}>
							<ThemeProvider>
								<NavigationProvider>{children}</NavigationProvider>
							</ThemeProvider>
						</SSRProvider>
					</SettingsContext.Provider>
				</ColorModeContext.Provider>
			</StateProvider>
		</QueriesProvider>
	);
};
