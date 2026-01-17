import type React from "react";
import { Text, View } from "react-native";

export const Header: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Header</Text>
		{children}
	</View>
);
