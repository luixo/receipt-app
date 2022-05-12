import React from "react";
import { makeTheme, styled, DripsyProvider } from "dripsy";

const theme = makeTheme({});

const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
	return <DripsyProvider theme={theme}>{children}</DripsyProvider>;
};

export { styled, ThemeProvider };
