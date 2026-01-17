import type React from "react";
import { Text, View } from "react-native";

export const Accordion: React.FC<React.PropsWithChildren> = ({ children }) => (
	<View>
		<Text>Accordion</Text>
		{children}
	</View>
);

export const AccordionItem: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<View>
		<Text>AccordionItem</Text>
		{children}
	</View>
);
