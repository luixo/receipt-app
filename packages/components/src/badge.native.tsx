import type React from "react";
import { Text, View } from "react-native";

export const Badge: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Badge</Text>
		{children}
	</View>
);
