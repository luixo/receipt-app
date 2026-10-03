import React from "react";

import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

type Props = {
	title: string;
	children: React.ComponentProps<typeof View>["children"];
	className?: string;
};

export const Group: React.FC<Props> = ({ title, children, className }) => (
	<View className={cn("flex gap-2", className)}>
		<Text variant="h2">{title}</Text>
		<View className="flex gap-3">{children}</View>
	</View>
);

export const Section: React.FC<Props> = ({ title, children, className }) => (
	<View className={cn("flex gap-1", className)}>
		<Text variant="h3">{title}</Text>
		<View className="flex gap-2">{children}</View>
	</View>
);
