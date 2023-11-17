import { useTheme as useNextUiTheme } from "@nextui-org/react";

export const useTheme = () => {
	const nextUiThemeContext = useNextUiTheme();
	if (!nextUiThemeContext.theme) {
		throw new Error("Expectd to have NextUI theme in useTheme");
	}
	return nextUiThemeContext.theme;
};

export type Theme = ReturnType<typeof useTheme>;
