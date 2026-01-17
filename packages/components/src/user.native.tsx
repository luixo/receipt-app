import type React from "react";
import { Text, View } from "react-native";

export const User: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>User</Text>
		{children}
	</View>
);
