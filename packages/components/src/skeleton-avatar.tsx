import type React from "react";

import { Avatar } from "~components/avatar";
import { Skeleton } from "~components/skeleton";

export const SkeletonAvatar: React.FC<
	Omit<React.ComponentProps<typeof Avatar>, "fallback">
> = (props) => (
	<Avatar
		{...props}
		testID="user-avatar-skeleton"
		fallback={<Skeleton className="size-full" />}
	/>
);
