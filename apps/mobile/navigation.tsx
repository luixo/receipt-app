import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountScreen } from "~app/features/account/account-screen";
import { AddDebtScreen } from "~app/features/add-debt/add-debt-screen";
import { AddReceiptScreen } from "~app/features/add-receipt/add-receipt-screen";
import { AddUserScreen } from "~app/features/add-user/add-user-screen";
import { ChangePasswordScreen } from "~app/features/change-password/change-password-screen";
import { ConnectionIntentionsScreen } from "~app/features/connection-intentions/connection-intentions-screen";
import { DebtScreen } from "~app/features/debt/debt-screen";
import { DebtsScreen } from "~app/features/debts/debts-screen";
import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";
import { DebtsIntentionsScreen } from "~app/features/debts-intentions/debts-intentions-screen";
import { HomeScreen } from "~app/features/home/home-screen";
import { LoginScreen } from "~app/features/login/login-screen";
import { ReceiptScreen } from "~app/features/receipt/receipt-screen";
import { ReceiptTransferIntentionsScreen } from "~app/features/receipt-transfer-intentions/receipt-transfer-intentions-screen";
import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { RegisterScreen } from "~app/features/register/register-screen";
import { ResetPasswordScreen } from "~app/features/reset-password/reset-password-screen";
import { SettingsScreen } from "~app/features/settings/settings-screen";
import { UserScreen } from "~app/features/user/user-screen";
import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { UsersScreen } from "~app/features/users/users-screen";

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
	debts: undefined;
	userDebts: {
		userId: string;
	};
	debtsExchange: {
		userId: string;
	};
	debtsExchangeAll: {
		userId: string;
	};
	debt: {
		id: string;
	};
	settings: undefined;
	addDebt: undefined;
	debtsSyncIntentions: undefined;
	receiptTransferIntentions: undefined;
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
			name="receiptTransferIntentions"
			component={ReceiptTransferIntentionsScreen}
			options={{
				title: "Receipt transfer intentions",
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
		<Stack.Screen
			name="debts"
			component={DebtsScreen}
			options={{
				title: "Debts",
			}}
		/>
		<Stack.Screen
			name="userDebts"
			component={UserDebtsScreen}
			options={{
				title: "User debts",
			}}
		/>
		<Stack.Screen
			name="debtsExchange"
			component={DebtsExchangeScreen}
			options={{
				title: "Debts exchange",
			}}
		/>
		<Stack.Screen
			name="debtsExchangeAll"
			component={DebtsExchangeAllScreen}
			options={{
				title: "Debts exchange / All",
			}}
		/>
		<Stack.Screen
			name="debt"
			component={DebtScreen}
			options={{
				title: "Debt",
			}}
		/>
		<Stack.Screen
			name="settings"
			component={SettingsScreen}
			options={{
				title: "Settings",
			}}
		/>
		<Stack.Screen
			name="addDebt"
			component={AddDebtScreen}
			options={{
				title: "Add debt",
			}}
		/>
		<Stack.Screen
			name="debtsSyncIntentions"
			component={DebtsIntentionsScreen}
			options={{
				title: "Debts sync intentions",
			}}
		/>
	</Stack.Navigator>
);
