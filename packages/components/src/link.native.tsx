import type React from "react";
import { Text, View } from "react-native";

export const Link: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Link</Text>
		{children}
	</View>
);

export const BackLink: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>BackLink</Text>
		{children}
	</View>
);

export const ButtonLink: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>ButtonLink</Text>
		{children}
	</View>
);

export const CardLink: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>CardLink</Text>
		{children}
	</View>
);
