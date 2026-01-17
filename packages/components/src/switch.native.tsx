import type React from "react";
import { Text, View } from "react-native";

export const SkeletonSwitch: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>SkeletonSwitch</Text>
		{children}
	</View>
);

export const Switch: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Switch</Text>
		{children}
	</View>
);
