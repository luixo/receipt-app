import type React from "react";

import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

type Props = {
	aside?: ViewReactNode;
	startContent?: ViewReactNode;
	endContent?: ViewReactNode;
	children?: string;
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
			{children ? <Text variant="h1">{children}</Text> : null}
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
	<PageHeader
		{...props}
		startContent={
			<Skeleton className={cn("h-10 w-40 rounded-md", className)} />
		}
	/>
);
