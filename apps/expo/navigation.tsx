import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountScreen } from "app/features/account/account-screen";
import { AddReceiptScreen } from "app/features/add-receipt/add-receipt-screen";
import { AddUserScreen } from "app/features/add-user/add-user-screen";
import { ChangePasswordScreen } from "app/features/change-password/change-password-screen";
import { ConnectionIntentionsScreen } from "app/features/connection-intentions/connection-intentions-screen";
import { HomeScreen } from "app/features/home/home-screen";
import { LoginScreen } from "app/features/login/login-screen";
import { ReceiptScreen } from "app/features/receipt/receipt-screen";
import { ReceiptsScreen } from "app/features/receipts/receipts-screen";
import { RegisterScreen } from "app/features/register/register-screen";
import { ResetPasswordScreen } from "app/features/reset-password/reset-password-screen";
import { UserScreen } from "app/features/user/user-screen";
import { UsersScreen } from "app/features/users/users-screen";

export type AppParamList = {
	home: undefined;
	account: undefined;
	receipts: undefined;
	login: undefined;
	register: undefined;
	receipt: {
		id: string;
	};
	addReceipt: undefined;
	users: undefined;
	user: {
		id: string;
	};
	addUser: undefined;
	userConnectionIntentions: undefined;
	changePassword: undefined;
	resetPassword: {
		token: string;
	};
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
			name="addUser"
			component={AddUserScreen}
			options={{
				title: "Add user",
			}}
		/>
		<Stack.Screen
			name="userConnectionIntentions"
			component={ConnectionIntentionsScreen}
			options={{
				title: "Connection intentions",
			}}
		/>
		<Stack.Screen
			name="changePassword"
			component={ChangePasswordScreen}
			options={{
				title: "Change password",
			}}
		/>
		<Stack.Screen
			name="addReceipt"
			component={AddReceiptScreen}
			options={{
				title: "Add receipt",
			}}
		/>
		<Stack.Screen
			name="resetPassword"
			component={ResetPasswordScreen}
			options={{
				title: "Reset password",
			}}
		/>
	</Stack.Navigator>
);
