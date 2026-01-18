import type React from "react";
import { View } from "react-native";

import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";

type Props = {
	aside?: React.ReactNode;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	children: React.ReactNode;
} & Omit<React.ComponentProps<typeof View>, "children">;

export const PageHeader: React.FC<Props> = ({
	aside,
	startContent,
	endContent,
	children,
	...props
}) => (
	<View className="flex-row flex-wrap justify-between gap-4">
		<View className="flex-1 flex-row items-center gap-4" {...props}>
			{startContent}
			{typeof children === "string" ? (
				<Text variant="h1">{children}</Text>
			) : (
				children
			)}
			{endContent}
		</View>
		<View
			className="ml-auto shrink-0 flex-row gap-2 self-end"
			testID="header-aside"
		>
			{aside}
		</View>
	</View>
);

export const SkeletonPageHeader: React.FC<
	Omit<React.ComponentProps<typeof PageHeader>, "children">
> = ({ className, ...props }) => (
	<PageHeader {...props}>
		<Skeleton className={cn("h-10 w-40 rounded-md", className)} />
	</PageHeader>
);
