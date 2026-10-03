import React from "react";

import { useTranslation } from "react-i18next";

import { AppVersion } from "~app/components/app-version";
import { useColorModes } from "~app/hooks/use-color-modes";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { View } from "~components/view";

import { ButtonShowcase } from "./button-showcase";
import { DialogShowcase } from "./dialog-showcase";
import { InputsShowcase } from "./inputs-showcase";
import { LinksShowcase } from "./links-showcase";
import { MiscShowcase } from "./misc-showcase";
import { SkeletonShowcase } from "./skeleton-showcase";
import { SwitchesShowcase } from "./switches-showcase";
import { TextShowcase } from "./text-showcase";
import { UserShowcase } from "./user-showcase";

const ThemeSwitcher = () => {
	const {
		system: [systemColorMode],
		selected: [
			selectedColorMode,
			setSelectedColorMode,
			removeSelectedColorMode,
		],
	} = useColorModes();
	const switchColorMode = React.useEffectEvent(() => {
		if (!selectedColorMode || selectedColorMode === systemColorMode) {
			setSelectedColorMode(systemColorMode === "dark" ? "light" : "dark");
		} else {
			removeSelectedColorMode();
		}
	});
	const colorMode = selectedColorMode ?? systemColorMode;
	return (
		<View className="sticky top-0 z-10 -m-2 h-0">
			<Button
				isIconOnly
				variant="ghost"
				className="absolute top-2 right-2"
				onPress={switchColorMode}
			>
				<Icon
					name={colorMode === "light" ? "moon" : "sun"}
					className="text-foreground size-6"
				/>
			</Button>
		</View>
	);
};

export const PlaygroundScreen = () => {
	const { t } = useTranslation();
	return (
		<>
			<ThemeSwitcher />
			<View className="flex gap-8 p-4">
				<Text variant="h1">{t("titles.index")}</Text>
				<ButtonShowcase />
				<UserShowcase />
				<LinksShowcase />
				<InputsShowcase />
				<DialogShowcase />
				<SkeletonShowcase />
				<SwitchesShowcase />
				<TextShowcase />
				<MiscShowcase />
				<AppVersion />
			</View>
		</>
	);
};
