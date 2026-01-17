import type React from "react";
import { Text, View } from "react-native";

export const Calendar: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Calendar</Text>
		{children}
	</View>
);
