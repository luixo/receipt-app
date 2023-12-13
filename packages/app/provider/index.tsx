import React from "react";

import type { ParsedUrlQuery } from "querystring";

import { NavigationProvider } from "./navigation";
import { QueriesProvider } from "./queries";
import { SSRProvider, type Props as SsrContext } from "./ssr";
import { StateProvider } from "./state";
import { ThemeProvider } from "./theme";

export type Props = {
	query: ParsedUrlQuery;
	ssrContext: SsrContext;
};

export const Provider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	query,
	ssrContext,
}) => (
	<QueriesProvider>
		<StateProvider query={query}>
			<SSRProvider {...ssrContext}>
				<ThemeProvider>
					<NavigationProvider>{children}</NavigationProvider>
				</ThemeProvider>
			</SSRProvider>
		</StateProvider>
	</QueriesProvider>
);
