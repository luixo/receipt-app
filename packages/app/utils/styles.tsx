import React from "react";
import * as ReactNative from "react-native";

import {
	NextUIProvider,
	lightThemeStitches,
	darkThemeStitches,
	createTheme,
} from "@nextui-org/react";
import { DripsyProvider } from "dripsy";

import { ColorModeContext } from "app/contexts/color-mode-context";

export const breakpoints = {
	xs: "320px",
	sm: "480px",
	md: "768px",
	lg: "1024px",
	xl: "1240px",
} as const;

const withBreakpoints = (stitchesTheme: typeof lightThemeStitches) => ({
	...stitchesTheme,
	theme: {
		...stitchesTheme.theme,
		breakpoints,
	},
	media: {
		...stitchesTheme.media,
		...(
			Object.entries(breakpoints) as [
				keyof typeof breakpoints,
				(typeof breakpoints)[keyof typeof breakpoints],
			][]
		).reduce<Partial<(typeof lightThemeStitches)["media"]>>(
			(acc, [key, breakpoint]) => {
				acc[key] = `(min-width: ${breakpoint})`;
				acc[`${key}Max`] = `(max-width: ${breakpoint})`;
				return acc;
			},
			{},
		),
	},
});

const stitchesThemes = {
	light: withBreakpoints(lightThemeStitches),
	dark: withBreakpoints(darkThemeStitches),
};

const themes = {
	light: stitchesThemes.light.theme,
	dark: stitchesThemes.dark.theme,
};

const nextThemes = {
	light: createTheme({ type: "light", theme: themes.light }),
	dark: createTheme({ type: "dark", theme: themes.dark }),
};

export const { media } = stitchesThemes.light;

export type Theme = (typeof themes)["light"];

const borderStyles = {
	solid: "solid",
} as const;

const types = {
	onlyAllowThemeValues: "always",
	reactNativeTypesOnly: true,
} as const;

const evaluateColors = <T extends Record<string, string>>(colors: T): T => {
	const retrieveValueRecursive = <K extends keyof T>(key: K): T[K] => {
		const value = colors[key]!;
		if (value.startsWith("$")) {
			return retrieveValueRecursive(value.slice(1) as K);
		}
		return value;
	};
	return Object.keys(colors).reduce<T>((acc, key: keyof T) => {
		acc[key] = retrieveValueRecursive(key);
		return acc;
	}, {} as T);
};

const theme = themes.light;
const commonTheme = {
	breakpoints: Object.values(breakpoints),
	borderWidths: theme.borderWeights,
	borderStyles,
	space: theme.space,
	sizes: theme.space,
	fonts: theme.fonts,
	fontSizes: theme.fontSizes,
	fontWeights: theme.fontWeights,
	lineHeights: theme.lineHeights,
	letterSpacings: theme.letterSpacings,
	radii: theme.radii,
	zIndices: theme.zIndices,
	transitions: theme.transitions,
	types,
};

const dripsyThemes = {
	light: {
		...commonTheme,
		colors: {
			...evaluateColors(themes.light.colors),
			overlay: "rgba(255, 255, 255, 0.5)",
		},
		shadows: themes.light.shadows,
		dropShadows: themes.light.dropShadows,
	},
	dark: {
		...commonTheme,
		colors: {
			...evaluateColors(themes.dark.colors),
			overlay: "rgba(0, 0, 0, 0.5)",
		},
		shadows: themes.dark.shadows,
		dropShadows: themes.dark.dropShadows,
	},
};

type DripsyTheme = (typeof dripsyThemes)["light"];

declare module "dripsy" {
	interface DripsyCustomTheme extends DripsyTheme {}
}

export const ThemeProvider: React.FC<React.PropsWithChildren<object>> = ({
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
	}, [colorScheme, setColorModeConfig]);
	const selectedMode = colorModeConfig.selected || colorModeConfig.last;
	const sureMode = selectedMode ?? "light";
	return (
		<DripsyProvider theme={dripsyThemes[sureMode]}>
			<NextUIProvider theme={nextThemes[sureMode]}>{children}</NextUIProvider>
		</DripsyProvider>
	);
};
