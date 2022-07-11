import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { HomeScreen } from "app/features/home/screen";
import { LoginScreen } from "app/features/auth/login";
import { RegisterScreen } from "app/features/auth/register";
import { AccountScreen } from "app/features/account/account-screen";
import { ReceiptsScreen } from "app/features/receipts/receipts-screen";
import { ReceiptScreen } from "app/features/receipts/receipt-screen";
import { UsersScreen } from "app/features/users/users-screen";
import { UserScreen } from "app/features/users/user-screen";
import { ChangePasswordScreen } from "app/features/account/change-password-screen";

export type AppParamList = {
	home: undefined;
	account: undefined;
	receipts: undefined;
	login: undefined;
	register: undefined;
	receipt: {
		id: string;
	};
	users: undefined;
	user: {
		id: string;
	};
	changePassword: undefined;
};

const Stack = createNativeStackNavigator<AppParamList>();

export const NativeNavigation: React.FC = () => (
	<Stack.Navigator>
		<Stack.Screen
			name="home"
			component={HomeScreen}
			options={{
				title: "Home",
			}}
		/>
		<Stack.Screen
			name="register"
			component={RegisterScreen}
			options={{
				title: "Register",
			}}
		/>
		<Stack.Screen
			name="login"
			component={LoginScreen}
			options={{
				title: "Login",
			}}
		/>
		<Stack.Screen
			name="account"
			component={AccountScreen}
			options={{
				title: "Account",
			}}
		/>
		<Stack.Screen
			name="receipts"
			component={ReceiptsScreen}
			options={{
				title: "Receipts",
			}}
		/>
		<Stack.Screen
			name="receipt"
			component={ReceiptScreen}
			options={{
				title: "Receipt",
			}}
		/>
		<Stack.Screen
			name="users"
			component={UsersScreen}
			options={{
				title: "Users",
			}}
		/>
		<Stack.Screen
			name="user"
			component={UserScreen}
			options={{
				title: "User",
			}}
		/>
		<Stack.Screen
			name="changePassword"
			component={ChangePasswordScreen}
			options={{
				title: "Change password",
			}}
		/>
	</Stack.Navigator>
);
