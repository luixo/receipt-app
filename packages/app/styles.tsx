import React from "react";
import * as ReactNative from "react-native";
import * as HTMLElements from "@expo/html-elements";
import { makeTheme, styled, DripsyProvider, DripsyBaseTheme } from "dripsy";
import { TextLink as BaseTextLink } from "solito/link";
import { ColorModeContext } from "./contexts/color-mode-context";

const base = {
	borderWidths: {
		$hairline: 1,
	},
	borderStyles: {
		$solid: "solid",
	},
	space: {
		$s: 8,
		$m: 16,
		$l: 32,
	},
	sizes: {
		$container: 600,
		$full: "100%",
	},
	fontWeights: {
		$thin: "400",
		$normal: "500",
		$bold: "600",
	},
	fontSizes: {
		$regular: 16,
	},
} as const;

// This is weird but we need to keep it to make 'onlyAllowThemeValues' work
const baseTheme: Partial<DripsyBaseTheme> = {};

const lightTheme = makeTheme({
	...baseTheme,
	...base,
	colors: {
		$background: "#c9d1d9" as string,
		$text: "#0d1117" as string,
		$primary: "#61C21B" as string,
		$secondary: "#718F5B" as string,
		$accent: "#F5F03C" as string,
		$highlight: "#F5C348" as string,
		$muted: "#F2E4DC" as string,
	},
	types: {
		onlyAllowThemeValues: "always",
		reactNativeTypesOnly: true,
	},
});
type Theme = typeof lightTheme;
const darkTheme: Theme = makeTheme({
	...base,
	colors: {
		$background: "#0d1117",
		$text: "#c9d1d9",
		$primary: "#1B32C2",
		$secondary: "#8979F6",
		$accent: "#F5F03C",
		$highlight: "#F5C348",
		$muted: "#F2E4DC",
	},
	types: {
		onlyAllowThemeValues: "always",
		reactNativeTypesOnly: true,
	},
});

declare module "dripsy" {
	interface DripsyCustomTheme extends Theme {}
}

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	const [colorModeConfig, setColorModeConfig] =
		React.useContext(ColorModeContext);
	const colorScheme = ReactNative.useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setColorModeConfig((prev) => ({ ...prev, last: colorScheme }));
	}, [colorScheme]);
	const selectedMode = colorModeConfig.selected || colorModeConfig.last;
	const theme = selectedMode === "dark" ? darkTheme : lightTheme;
	return <DripsyProvider theme={theme}>{children}</DripsyProvider>;
};

export const Text = styled(ReactNative.Text)({ color: "$text" });
export const H1 = styled(HTMLElements.H1)({ color: "$text" });
export const P = styled(HTMLElements.P)({ color: "$text" });
export const A = styled(HTMLElements.A)({ color: "$text" });
export const TextLink = styled(BaseTextLink)({ color: "$highlight" });

export { styled };
