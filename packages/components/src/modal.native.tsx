import type React from "react";
import { Text, View } from "react-native";

export const Modal: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Modal</Text>
		{children}
	</View>
);

export const ModalBody: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>ModalBody</Text>
		{children}
	</View>
);

export const ModalContent: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>ModalContent</Text>
		{children}
	</View>
);

export const ModalHeader: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>ModalHeader</Text>
		{children}
	</View>
);
