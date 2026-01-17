import type React from "react";
import { Text, View } from "react-native";

export const Pagination: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Pagination</Text>
		{children}
	</View>
);
