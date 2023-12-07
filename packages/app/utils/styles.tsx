import React from "react";
import * as ReactNative from "react-native";

import { NextUIProvider } from "@nextui-org/react-tailwind";

import { ColorModeContext } from "app/contexts/color-mode-context";
import { useRouter } from "app/hooks/use-router";

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
	return <NextUIProvider navigate={router.push}>{children}</NextUIProvider>;
};
