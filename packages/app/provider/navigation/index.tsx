import React from "react";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { AppParamList } from "expo-app/navigation";
import { useDripsyTheme } from "dripsy";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const { theme } = useDripsyTheme();
	const navigationTheme = React.useMemo(
		() => ({
			dark: false,
			colors: {
				primary: theme.colors.$primary,
				background: theme.colors.$background,
				card: theme.colors.$background,
				text: theme.colors.$text,
				border: theme.colors.$muted,
				notification: theme.colors.$accent,
			},
		}),
		[theme]
	);
	const linking = React.useMemo<LinkingOptions<AppParamList>>(
		() => ({
			prefixes: [Linking.createURL("/")],
			config: {
				initialRouteName: "home",
				screens: {
					home: "",
					login: "login/",
					register: "register/",
					account: "account/",
					receipts: "receipts/",
					receipt: "receipts/:id",
					users: "users/",
					user: "users/:id",
					changePassword: "account/change-password",
				},
			},
		}),
		[]
	);
	return (
		<NavigationContainer linking={linking} theme={navigationTheme}>
			{children}
		</NavigationContainer>
	);
};
