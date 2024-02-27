import React from "react";
import { useColorScheme } from "react-native";

import { NextUIProvider } from "@nextui-org/react";
import { useRouter } from "solito/navigation";

import {
	useLastColorModeCookie,
	useSelectedColorModeCookie,
} from "~app/hooks/use-color-modes";

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
