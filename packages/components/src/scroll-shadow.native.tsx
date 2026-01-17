import type React from "react";
import { Text, View } from "react-native";

export const ScrollShadow: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>ScrollShadow</Text>
		{children}
	</View>
);
