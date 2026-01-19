import type React from "react";

import { Input } from "~components/input";
import { Skeleton } from "~components/skeleton";

import { cn } from "./utils";

export const SkeletonInput: React.FC<
	Pick<
		React.ComponentProps<typeof Input>,
		"multiline" | "startContent" | "label" | "endContent" | "className" | "size"
	> & {
		skeletonClassName?: string;
	}
> = ({ startContent, skeletonClassName, ...props }) => (
	<Input
		{...props}
		isDisabled
		isReadOnly
		startContent={
			startContent === undefined ? (
				<Skeleton className={cn("h-4 w-32 rounded-md", skeletonClassName)} />
			) : (
				startContent
			)
		}
	/>
);
