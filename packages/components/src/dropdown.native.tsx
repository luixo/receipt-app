import type React from "react";
import { Text, View } from "react-native";

export const Dropdown: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Dropdown</Text>
		{children}
	</View>
);

export const DropdownItem: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>DropdownItem</Text>
		{children}
	</View>
);

export const DropdownMenu: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>DropdownMenu</Text>
		{children}
	</View>
);

export const DropdownTrigger: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>DropdownTrigger</Text>
		{children}
	</View>
);
