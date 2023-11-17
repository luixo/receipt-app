import React from "react";

import type { LinkingOptions } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import type { AppParamList } from "expo-app/navigation";
import * as Linking from "expo-linking";

import { useTheme } from "app/hooks/use-theme";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const theme = useTheme();
	const navigationTheme = React.useMemo(
		() => ({
			dark: false,
			colors: {
				primary: theme.colors.primary.value,
				background: theme.colors.background.value,
				card: theme.colors.background.value,
				text: theme.colors.text.value,
				border: theme.colors.border.value,
				notification: theme.colors.accents0.value,
			},
		}),
		[theme],
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
					addReceipt: "receipts/add",
					users: "users/",
					user: "users/:id",
					addUser: "users/add",
					userConnectionIntentions: "users/connections",
					changePassword: "account/change-password",
					resetPassword: "reset-password/",
					debts: "debts/",
					userDebts: "debts/user/:userId",
					debt: "debts/:id",
					settings: "settings/",
					addDebt: "debts/add",
					debtsSyncIntentions: "debts/intentions",
				},
			},
		}),
		[],
	);
	return (
		<NavigationContainer linking={linking} theme={navigationTheme}>
			{children}
		</NavigationContainer>
	);
};
