import type React from "react";

import { Skeleton as SkeletonRaw } from "@heroui/skeleton";

export type Props = {
	className?: string;
	testID?: string;
};

export const Skeleton: React.FC<Props> = ({ className, testID }) => (
	<SkeletonRaw className={className} data-testid={testID} />
);
