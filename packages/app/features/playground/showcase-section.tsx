import React from "react";

import { Text } from "~components/text";
import { View } from "~components/view";

type Props = {
	title: string;
	children: React.ComponentProps<typeof View>["children"];
};

export const Group: React.FC<Props> = ({ title, children }) => (
	<View className="flex gap-2">
		<Text variant="h2">{title}</Text>
		<View className="flex gap-3">{children}</View>
	</View>
);

export const Section: React.FC<Props> = ({ title, children }) => (
	<View className="flex gap-1">
		<Text variant="h3">{title}</Text>
		<View className="flex gap-2">{children}</View>
	</View>
);
