import type React from "react";
import { Text, View } from "react-native";

export const SkeletonInput: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>SkeletonInput</Text>
		{children}
	</View>
);

export const Input: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Input</Text>
		{children}
	</View>
);
