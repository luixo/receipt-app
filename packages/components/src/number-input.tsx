import type React from "react";
import { View } from "react-native";

import { NumberInput as NumberInputRaw } from "@heroui/number-input";

import { SaveButton } from "~components/save-button";
import type { FieldError, MutationsProp } from "~components/utils";
import { cn, useErrorState, useMutationLoading } from "~components/utils";

type Props = Omit<
	React.ComponentProps<typeof NumberInputRaw>,
	"errorMessage"
> & {
	fieldError?: FieldError;
	mutation?: MutationsProp;
	errorMessage?: React.ReactNode;
	saveProps?: React.ComponentProps<typeof SaveButton>;
};

export const NumberInput: React.FC<Props> = ({
	className,
	fieldError,
	mutation,
	endContent,
	saveProps,
	...props
}) => {
	const isMutationLoading = useMutationLoading({ mutation });
	const { isWarning, isError, errors } = useErrorState({
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
			endContent={
				<View className="flex-row gap-2">
					{endContent}
					{saveProps && !saveProps.isHidden ? (
						<SaveButton
							{...saveProps}
							isLoading={isMutationLoading}
							isDisabled={isWarning || isError}
						/>
					) : null}
				</View>
			}
		/>
	);
};
