import type React from "react";
import { Text, View } from "react-native";

export const Card: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Card</Text>
		{children}
	</View>
);

export const CardBody: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>CardBody</Text>
		{children}
	</View>
);

export const CardFooter: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>CardFooter</Text>
		{children}
	</View>
);

export const CardHeader: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>CardHeader</Text>
		{children}
	</View>
);
