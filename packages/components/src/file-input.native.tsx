import type React from "react";
import { Text, View } from "react-native";

export const FileInput: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>FileInput</Text>
		{children}
	</View>
);
