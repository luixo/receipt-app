import React from "react";

import type { LinkingOptions } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import type { AppParamList } from "expo-app/navigation";
import * as Linking from "expo-linking";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const navigationTheme = React.useMemo(
		() => ({
			dark: false,
			colors: {
				primary: "unknown",
				background: "unknown",
				card: "unknown",
				text: "unknown",
				border: "unknown",
				notification: "unknown",
			},
		}),
		[],
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
