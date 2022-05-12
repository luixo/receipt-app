import React from "react";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { AppParamList } from "../../../../apps/expo/navigation";

export const NavigationProvider: React.FC<React.PropsWithChildren<{}>> = ({
	children,
}) => {
	const linking = React.useMemo<LinkingOptions<AppParamList>>(
		() => ({
			prefixes: [Linking.createURL("/")],
			config: {
				initialRouteName: "home",
				screens: {
					home: "",
					receipts: "receipts/",
					receipt: "receipts/:id",
				},
			},
		}),
		[]
	);
	return (
		<NavigationContainer linking={linking}>{children}</NavigationContainer>
	);
};
