import React from "react";
import { useColorScheme } from "react-native";

import {
	useLastColorMode,
	useSelectedColorMode,
} from "~app/hooks/use-color-modes";
import { useHref, useNavigate } from "~app/hooks/use-navigation";
import { HeroUIProvider } from "~components/utils";

export const ThemeProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const [selectedColorMode] = useSelectedColorMode();
	const [lastColorMode, setLastColorMode] = useLastColorMode();
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
	const navigate = useNavigate();
	const href = useHref();
	const localNavigate = React.useCallback<
		NonNullable<React.ComponentProps<typeof HeroUIProvider>["navigate"]>
	>((nextHref, options) => navigate({ to: nextHref, ...options }), [navigate]);
	return (
		<HeroUIProvider
			navigate={localNavigate}
			useHref={href}
			validationBehavior="native"
		>
			{children}
		</HeroUIProvider>
	);
};
