import React from "react";
import { View } from "react-native";

import { Text } from "~components/text";
import { cn } from "~components/utils";

type Props = {
	title: string;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	children?: React.ReactNode;
} & Omit<React.ComponentProps<typeof View>, "children">;

export const EmptyCard = React.memo<Props>(
	({ title, children, startContent, endContent, className, ...props }) => (
		<View
			{...props}
			className={cn("m-10 gap-4 self-center md:max-w-lg", className)}
			testID="empty-card"
		>
			{startContent}
			<Text variant="h2" className="text-center">
				{title}
			</Text>
			{children ? (
				typeof children === "string" ? (
					<Text variant="h3" className="text-center">
						{children}
					</Text>
				) : (
					children
				)
			) : null}
			{endContent}
		</View>
	),
);
