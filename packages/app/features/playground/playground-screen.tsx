import { useTranslation } from "react-i18next";

import { AppVersion } from "~app/components/app-version";
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

export const PlaygroundScreen = () => {
	const { t } = useTranslation();
	return (
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
	);
};
