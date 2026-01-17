import type React from "react";
import { Text, View } from "react-native";

export const Divider: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Divider</Text>
		{children}
	</View>
);
