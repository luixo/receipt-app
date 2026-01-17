import type React from "react";
import { Text, View } from "react-native";

export const Autocomplete: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>Autocomplete</Text>
		{children}
	</View>
);

export const AutocompleteItem: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>AutocompleteItem</Text>
		{children}
	</View>
);

export const AutocompleteSection: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>AutocompleteSection</Text>
		{children}
	</View>
);
