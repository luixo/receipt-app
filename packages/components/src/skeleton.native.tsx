import type React from "react";

import { Skeleton as SkeletonRaw } from "heroui-native";

import type { Props } from "./skeleton.web";

export const Skeleton: React.FC<Props> = ({ className, testID }) => (
	<SkeletonRaw className={className} testID={testID} />
);
