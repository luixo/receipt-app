import type React from "react";

import { Text } from "#components/text.tsx";
import { cn } from "#components/utils.ts";
import type { ViewReactNode } from "#components/view.tsx";
import { View } from "#components/view.tsx";

type Props = {
	title: string;
	startContent?: ViewReactNode;
	endContent?: ViewReactNode;
	children?: ViewReactNode;
} & Omit<React.ComponentProps<typeof View>, "children">;

export const EmptyCard: React.FC<Props> = ({
	title,
	children,
	startContent,
	endContent,
	className,
	...props
}) => (
	<View
		{...props}
		className={cn("m-10 gap-4 self-center md:max-w-lg", className)}
		testID="empty-card"
	>
		{startContent}
		<Text variant="h2" className="text-center">
			{title}
		</Text>
		{children}
		{endContent}
	</View>
);
