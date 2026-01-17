import type React from "react";
import { Text, View } from "react-native";

export const Chip: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Chip</Text>
		{children}
	</View>
);
