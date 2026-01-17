import type React from "react";
import { Text, View } from "react-native";

import type { Props } from "./highlighted-text";

export const HighlightedText: React.FC<Props> = ({ children }) => (
	<View className="bg-amber-300">
		<Text>{children}</Text>
	</View>
);
