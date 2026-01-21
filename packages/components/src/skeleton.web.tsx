import type React from "react";

import { Skeleton as SkeletonRaw } from "@heroui/skeleton";

export type Props = {
	className?: string;
};

export const Skeleton: React.FC<Props> = ({ className }) => (
	<SkeletonRaw className={className} />
);
