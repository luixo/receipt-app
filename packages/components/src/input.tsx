import React from "react";
import { View } from "react-native";

import { Input as InputRaw, Textarea } from "@heroui/input";

import { EyeIcon, EyeSlashIcon } from "~components/icons";

import { Button } from "./button";
import type { FieldError, MutationsProp } from "./utils";
import { cn, getErrorState, getMutationLoading, tv } from "./utils";

const input = tv({});

type Props = Omit<
	React.ComponentProps<typeof InputRaw | typeof Textarea>,
	"ref"
> & {
	fieldError?: FieldError;
	mutation?: MutationsProp;
	multiline?: boolean;
};

export const Input = React.forwardRef<
	HTMLInputElement & HTMLTextAreaElement,
	Props
>(
	(
		{ className, fieldError, mutation, endContent, multiline, ...props },
		ref,
	) => {
		const [visible, setVisible] = React.useState(false);
		const switchValue = React.useCallback(
			() => setVisible((prev) => !prev),
			[],
		);
		const Component = multiline ? Textarea : InputRaw;
		const isMutationLoading = getMutationLoading(mutation);
		const { isWarning, isError, errors } = getErrorState({
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
						? visible
							? undefined
							: "password"
						: props.type
				}
				endContent={
					<View className="flex-row gap-2">
						{endContent}
						{props.type === "password" ? (
							<Button variant="light" isIconOnly>
								{visible ? (
									<EyeSlashIcon onClick={switchValue} size={24} />
								) : (
									<EyeIcon onClick={switchValue} size={24} />
								)}
							</Button>
						) : null}
					</View>
				}
			/>
		);
	},
);
