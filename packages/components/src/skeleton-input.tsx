import type React from "react";

import { Input } from "#components/input.tsx";
import { Skeleton } from "#components/skeleton.tsx";
import { cn } from "#components/utils.ts";

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
