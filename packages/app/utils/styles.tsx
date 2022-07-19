import React from "react";
import * as ReactNative from "react-native";

import * as HTMLElements from "@expo/html-elements";
import {
	NextUIProvider,
	lightThemeStitches,
	darkThemeStitches,
	createTheme,
} from "@nextui-org/react";
import { styled, DripsyProvider, useSx, useDripsyTheme } from "dripsy";
import { TextLink as BaseTextLink } from "solito/link";

import { ColorModeContext } from "app/contexts/color-mode-context";

const themes = {
	light: lightThemeStitches.theme,
	dark: darkThemeStitches.theme,
};

const nextThemes = {
	light: createTheme({ type: "light", theme: themes.light }),
	dark: createTheme({ type: "dark", theme: themes.dark }),
};

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

const commonTheme = {
	breakpoints: Object.values(themes.light.breakpoints),
	borderWidths: themes.light.borderWeights,
	borderStyles,
	space: themes.light.space,
	sizes: {
		...themes.light.space,
		full: "100%",
	},
	fonts: themes.light.fonts,
	fontSizes: themes.light.fontSizes,
	fontWeights: themes.light.fontWeights,
	lineHeights: themes.light.lineHeights,
	letterSpacings: themes.light.letterSpacings,
	radii: themes.light.radii,
	zIndices: themes.light.zIndices,
	transitions: themes.light.transitions,
	types,
};

const dripsyThemes = {
	light: {
		...commonTheme,
		colors: evaluateColors(themes.light.colors),
		shadows: themes.light.shadows,
		dropShadows: themes.light.dropShadows,
	},
	dark: {
		...commonTheme,
		colors: evaluateColors(themes.dark.colors),
		shadows: themes.dark.shadows,
		dropShadows: themes.dark.dropShadows,
	},
};

type DripsyTheme = typeof dripsyThemes["light"];

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

export const Text = styled(ReactNative.Text)({ color: "text" });
export const H1 = styled(HTMLElements.H1)({ color: "text" });
export const P = styled(HTMLElements.P)({ color: "text" });
export const A = styled(HTMLElements.A)({ color: "text" });
export const TextLink = ({
	textProps,
	...props
}: React.ComponentProps<typeof BaseTextLink>) => {
	const sx = useSx();
	const linkStyle = sx({
		fontSize: "base",
		fontWeight: "bold",
		color: "primary",
	});
	return (
		<BaseTextLink
			{...props}
			textProps={{
				...textProps,
				style: ReactNative.StyleSheet.compose(linkStyle, props?.style),
			}}
		/>
	);
};
const StyledTextInput = styled(ReactNative.TextInput)({
	color: "text",
	borderColor: "border",
	width: 96,
	borderWidth: "light",
	borderRadius: "md",
	padding: "sm",
});
export const TextInput = (
	props: React.ComponentProps<typeof StyledTextInput>
) => {
	const { theme } = useDripsyTheme();
	return (
		<StyledTextInput placeholderTextColor={theme.colors.secondary} {...props} />
	);
};
export const ScrollView = ({
	contentContainerStyle,
	...props
}: ReactNative.ScrollViewProps) => {
	const sx = useSx();
	return (
		<ReactNative.ScrollView
			{...props}
			contentContainerStyle={[
				sx({ justifyContent: "center", alignItems: "stretch", width: "full" }),
				contentContainerStyle,
			]}
		/>
	);
};

export { styled };
