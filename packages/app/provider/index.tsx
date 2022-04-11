import React from "react";
import { NavigationProvider } from "./navigation";
import { ThemeProvider } from "../styles";

export const Provider: React.FC = ({ children }) => {
	return (
		<NavigationProvider>
			<ThemeProvider>{children}</ThemeProvider>
		</NavigationProvider>
	);
};
