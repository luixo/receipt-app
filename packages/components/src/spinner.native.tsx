import type React from "react";
import { Text, View } from "react-native";

export const Spinner: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Spinner</Text>
		{children}
	</View>
);
