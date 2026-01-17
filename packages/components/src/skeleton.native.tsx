import type React from "react";
import { Text, View } from "react-native";

export const Skeleton: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Skeleton</Text>
		{children}
	</View>
);
