import type React from "react";
import { Text, View } from "react-native";

export const Select: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Select</Text>
		{children}
	</View>
);

export const SelectItem: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>SelectItem</Text>
		{children}
	</View>
);
