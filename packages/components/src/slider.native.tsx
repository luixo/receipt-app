import type React from "react";
import { Text, View } from "react-native";

export const Slider: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Slider</Text>
		{children}
	</View>
);
