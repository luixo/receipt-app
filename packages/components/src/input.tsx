import React from "react";
import { View } from "react-native";

import { Input as InputRaw, Textarea } from "@heroui/input";

import { EyeIcon, EyeSlashIcon } from "~components/icons";
import { SaveButton } from "~components/save-button";

import { Button } from "./button";
import type { FieldError, MutationOrMutations } from "./utils";
import { cn, tv, useErrorState, useMutationLoading } from "./utils";

const input = tv({});

type Props = Omit<
	React.ComponentProps<typeof InputRaw | typeof Textarea>,
	"ref"
> & {
	fieldError?: FieldError;
	mutation?: MutationOrMutations;
	saveProps?: React.ComponentProps<typeof SaveButton>;
	multiline?: boolean;
};

export const Input = React.forwardRef<
	HTMLInputElement & HTMLTextAreaElement,
	Props
>(
	(
		{
			className,
			fieldError,
			mutation,
			endContent,
			saveProps,
			multiline,
			...props
		},
		ref,
	) => {
		const [isVisible, setVisible] = React.useState(false);
		const switchValue = React.useCallback(
			() => setVisible((prev) => !prev),
			[],
		);
		const Component = multiline ? Textarea : InputRaw;
		const isMutationLoading = useMutationLoading({ mutation });
		const { isWarning, isError, errors } = useErrorState({
			mutation,
			fieldError,
		});
		return (
			<Component
				ref={ref}
				{...props}
				isDisabled={isMutationLoading || props.isDisabled}
				color={isWarning ? "warning" : isError ? "danger" : props.color}
				description={errors.join("\n")}
				classNames={{
					base: input({ className }),
					description: cn(
						"whitespace-pre",
						isWarning ? "text-warning" : undefined,
					),
				}}
				type={
					props.type === "password"
						? isVisible
							? undefined
							: "password"
						: props.type
				}
				endContent={
					<View className="flex-row gap-2">
						{endContent}
						{props.type === "password" ? (
							<Button variant="light" isIconOnly>
								{isVisible ? (
									<EyeSlashIcon onClick={switchValue} size={24} />
								) : (
									<EyeIcon onClick={switchValue} size={24} />
								)}
							</Button>
						) : null}
						{saveProps && !saveProps.isHidden ? (
							<SaveButton
								{...saveProps}
								isLoading={isMutationLoading}
								isDisabled={isWarning || isError || props.isInvalid}
							/>
						) : null}
					</View>
				}
			/>
		);
	},
);
