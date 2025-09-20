import type React from "react";

import { NumberInput as NumberInputRaw } from "@heroui/number-input";
import { useIsSSR } from "@react-aria/ssr";

import { Skeleton } from "~components/skeleton";
import type { FieldError, MutationsProp } from "~components/utils";
import { cn, getErrorState, getMutationLoading } from "~components/utils";

export const SkeletonNumberInput: React.FC<
	React.ComponentProps<typeof NumberInputRaw> & {
		skeletonClassName?: string;
	}
> = ({ startContent, skeletonClassName, ...props }) => (
	<NumberInputRaw
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

type Props = Omit<
	React.ComponentProps<typeof NumberInputRaw>,
	"errorMessage"
> & {
	fieldError?: FieldError;
	mutation?: MutationsProp;
	continuousMutations?: boolean;
	errorMessage?: React.ReactNode;
	fractionDigits: number;
};

export const NumberInput: React.FC<Props> = ({
	className,
	fieldError,
	mutation,
	continuousMutations = false,
	fractionDigits,
	formatOptions,
	...props
}) => {
	const isMutationLoading = getMutationLoading(mutation);
	const { isWarning, isError, errors } = getErrorState({
		mutation,
		fieldError,
	});
	const isSSR = useIsSSR();
	return (
		<NumberInputRaw
			{...props}
			isDisabled={
				(continuousMutations ? false : isMutationLoading) || props.isDisabled
			}
			color={isWarning ? "warning" : isError ? "danger" : undefined}
			description={errors.join("\n")}
			isInvalid={errors.length !== 0 || props.isInvalid}
			classNames={{
				base: className,
				description: cn(
					"whitespace-pre",
					isWarning ? "text-warning" : undefined,
				),
			}}
			step={10 ** -fractionDigits}
			formatOptions={
				isSSR
					? // iPhone make some format options mismatch on hydration
						// see https://github.com/adobe/react-spectrum/issues/8503
						{ maximumFractionDigits: 0, ...formatOptions }
					: { maximumFractionDigits: fractionDigits, ...formatOptions }
			}
		/>
	);
};
