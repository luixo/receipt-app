import type React from "react";

import { NumberInput as NumberInputRaw } from "@heroui/number-input";

import type { FieldError, MutationsProp } from "~components/utils";
import { cn, getErrorState, getMutationLoading } from "~components/utils";

type Props = Omit<
	React.ComponentProps<typeof NumberInputRaw>,
	"errorMessage"
> & {
	fieldError?: FieldError;
	mutation?: MutationsProp;
	errorMessage?: React.ReactNode;
};

export const NumberInput: React.FC<Props> = ({
	className,
	fieldError,
	mutation,
	endContent,
	...props
}) => {
	const isMutationLoading = getMutationLoading(mutation);
	const { isWarning, isError, errors } = getErrorState({
		mutation,
		fieldError,
	});
	return (
		<NumberInputRaw
			{...props}
			isDisabled={isMutationLoading || props.isDisabled}
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
		/>
	);
};
