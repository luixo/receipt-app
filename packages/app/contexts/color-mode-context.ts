import React from "react";

export const LAST_COLOR_MODE_COOKIE_NAME = "receipt_lastColorMode";
export const SELECTED_COLOR_MODE_COOKIE_NAME = "receipt_selectedColorMode";

export type ColorMode = "dark" | "light";
export type ColorModeConfig = {
	last?: ColorMode;
	selected?: ColorMode;
};

type ColorModeContextType = [
	ColorModeConfig,
	React.Dispatch<React.SetStateAction<ColorModeConfig>>
];

export const ColorModeContext = React.createContext<ColorModeContextType>([
	{},
	() => {},
]);
