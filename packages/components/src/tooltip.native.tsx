import type React from "react";
import { Text, View } from "react-native";

export const Tooltip: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Tooltip</Text>
		{children}
	</View>
);
