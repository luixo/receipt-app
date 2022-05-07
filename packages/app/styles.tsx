import React from "react";
import { makeTheme, styled, DripsyProvider } from "dripsy";

const theme = makeTheme({});

const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
	return (
		<DripsyProvider
			theme={theme}
			// this disables SSR, since react-native-web doesn't have support for it (yet)
			ssr
		>
			{children}
		</DripsyProvider>
	);
};

export { styled, ThemeProvider };
