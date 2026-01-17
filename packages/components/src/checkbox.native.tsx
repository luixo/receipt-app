import type React from "react";
import { Text, View } from "react-native";

export const Checkbox: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Checkbox</Text>
		{children}
	</View>
);
