import React from "react";
import { QueriesProvider } from "./queries";
import { NavigationProvider } from "./navigation";
import { ThemeProvider } from "../styles";

export const Provider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	return (
		<QueriesProvider>
			<NavigationProvider>
				<ThemeProvider>{children}</ThemeProvider>
			</NavigationProvider>
		</QueriesProvider>
	);
};
