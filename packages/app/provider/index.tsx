import React from "react";
import { NavigationProvider } from "./navigation";
import { ThemeProvider } from "../styles";

export const Provider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	return (
		<NavigationProvider>
			<ThemeProvider>{children}</ThemeProvider>
		</NavigationProvider>
	);
};
