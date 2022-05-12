import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { HomeScreen } from "app/features/home/screen";
import { ReceiptsScreen } from "app/features/receipts/receipts-screen";
import { ReceiptScreen } from "app/features/receipts/receipt-screen";

export type AppParamList = {
	home: undefined;
	receipts: undefined;
	receipt: {
		id: string;
	};
};

const Stack = createNativeStackNavigator<AppParamList>();

export const NativeNavigation: React.FC = () => {
	return (
		<Stack.Navigator>
			<Stack.Screen
				name="home"
				component={HomeScreen}
				options={{
					title: "Home",
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
		</Stack.Navigator>
	);
};
