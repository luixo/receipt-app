import React from "react";
import { useColorScheme } from "react-native";

import { useRouter } from "solito/navigation";

import {
	useLastColorModeCookie,
	useSelectedColorModeCookie,
} from "~app/hooks/use-color-modes";
import { NextUIProvider } from "~components";

export const ThemeProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [selectedColorMode] = useSelectedColorModeCookie();
	const [lastColorMode, setLastColorMode] = useLastColorModeCookie();
	const colorScheme = useColorScheme();
	React.useEffect(() => {
		if (!colorScheme) {
			return;
		}
		setLastColorMode(colorScheme);
	}, [colorScheme, setLastColorMode]);
	const selectedMode = selectedColorMode || lastColorMode;
	React.useEffect(() => {
		const html = document.querySelector("html");
		if (!html) {
			return;
		}
		html.setAttribute("data-theme", selectedMode);
		html.classList.add(selectedMode);
		html.classList.remove(selectedMode === "dark" ? "light" : "dark");
	}, [selectedMode]);
	const router = useRouter();
	return <NextUIProvider navigate={router.push}>{children}</NextUIProvider>;
};
