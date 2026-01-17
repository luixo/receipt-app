import type React from "react";
import { Text, View } from "react-native";

export const SkeletonNumberInput: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>SkeletonNumberInput</Text>
		{children}
	</View>
);

export const NumberInput: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>NumberInput</Text>
		{children}
	</View>
);
