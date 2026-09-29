import type React from "react";

import { NumberInput } from "#components/number-input.tsx";
import { Skeleton } from "#components/skeleton.tsx";
import { cn } from "#components/utils.ts";

export const SkeletonNumberInput: React.FC<
	Partial<
		React.ComponentProps<typeof NumberInput> & {
			skeletonClassName?: string;
		}
	>
> = ({ startContent, skeletonClassName, ...props }) => (
	<NumberInput
		{...props}
		isDisabled
		isReadOnly
		fractionDigits={0}
		startContent={
			startContent === undefined ? (
				<Skeleton className={cn("h-4 w-32 rounded-md", skeletonClassName)} />
			) : (
				startContent
			)
		}
	/>
);
