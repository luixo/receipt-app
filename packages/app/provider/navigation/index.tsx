import React from "react";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { AppParamList } from "../../../../apps/expo/navigation";

export const NavigationProvider: React.FC = ({ children }) => {
	const linking = React.useMemo<LinkingOptions<AppParamList>>(
		() => ({
			prefixes: [Linking.createURL("/")],
			config: {
				initialRouteName: "home",
				screens: {
					home: "",
					receipt: "receipt/:id",
				},
			},
		}),
		[]
	);
	return (
		<NavigationContainer linking={linking}>{children}</NavigationContainer>
	);
};
