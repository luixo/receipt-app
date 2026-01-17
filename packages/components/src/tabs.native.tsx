import type React from "react";
import { Text, View } from "react-native";

export const TabsSkeleton: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>TabsSkeleton</Text>
		{children}
	</View>
);

export const Tabs: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Tabs</Text>
		{children}
	</View>
);

export const Tab: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Tab</Text>
		{children}
	</View>
);
