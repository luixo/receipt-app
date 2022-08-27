import React from "react";

import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { useDripsyTheme } from "dripsy";
import { AppParamList } from "expo-app/navigation";
import * as Linking from "expo-linking";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const { theme } = useDripsyTheme();
	const navigationTheme = React.useMemo(
		() => ({
			dark: false,
			colors: {
				primary: theme.colors.primary,
				background: theme.colors.background,
				card: theme.colors.background,
				text: theme.colors.text,
				border: theme.colors.border,
				notification: theme.colors.accents0,
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
		[]
	);
	return (
		<NavigationContainer linking={linking} theme={navigationTheme}>
			{children}
		</NavigationContainer>
	);
};
