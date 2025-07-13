import type React from "react";
import { View } from "react-native";

import { H1 } from "~components/header";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";

type Props = {
	aside?: React.ReactNode;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
} & React.ComponentProps<typeof View>;

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
			<Text Component={H1} className="text-4xl font-medium">
				{children}
			</Text>
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
	React.ComponentProps<typeof PageHeader>
> = ({ className, ...props }) => (
	<PageHeader {...props}>
		<Skeleton className={cn("h-10 w-40 rounded-md", className)} />
	</PageHeader>
);
