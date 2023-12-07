import React from "react";
import * as ReactNative from "react-native";

import {
	NextUIProvider,
	createTheme,
	darkThemeStitches,
	lightThemeStitches,
} from "@nextui-org/react";
import { NextUIProvider as ModernNextUIProvider } from "@nextui-org/react-tailwind";

import { ColorModeContext } from "app/contexts/color-mode-context";
import { useRouter } from "app/hooks/use-router";

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

const nextThemes = {
	light: createTheme({ type: "light", theme: stitchesThemes.light.theme }),
	dark: createTheme({ type: "dark", theme: stitchesThemes.dark.theme }),
};

export const { media } = stitchesThemes.light;

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
	React.useEffect(() => {
		const html = document.querySelector("html")!;
		html.setAttribute("data-theme", sureMode);
		html.classList.add(sureMode);
		html.classList.remove(sureMode === "dark" ? "light" : "dark");
	}, [sureMode]);
	const router = useRouter();
	return (
		<ModernNextUIProvider navigate={router.push}>
			<NextUIProvider theme={nextThemes[sureMode]}>{children}</NextUIProvider>
		</ModernNextUIProvider>
	);
};
