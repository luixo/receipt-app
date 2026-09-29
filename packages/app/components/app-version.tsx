import React from "react";

import { useTranslation } from "react-i18next";

import { AppVersionContext } from "~app/contexts/app-version-context";
import { Text } from "~components/text";
import { View } from "~components/view";

export const AppVersion: React.FC<
	React.ComponentProps<typeof View> & {
		textProps?: React.ComponentProps<typeof Text>;
	}
> = ({ textProps, ...props }) => {
	const { t } = useTranslation();
	const version = React.use(AppVersionContext);
	return (
		<View {...props}>
			<Text {...textProps}>{t("components.version.current", { version })}</Text>
		</View>
	);
};
