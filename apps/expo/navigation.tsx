import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { HomeScreen } from "app/features/home/screen";
import { ReceiptScreen } from "app/features/receipt/receipt-screen";

export type AppParamList = {
	home: undefined;
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
				name="receipt"
				component={ReceiptScreen}
				options={{
					title: "Receipt",
				}}
			/>
		</Stack.Navigator>
	);
};
