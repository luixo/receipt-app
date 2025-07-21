import React from "react";
import { View } from "react-native";

import { Input as InputRaw, Textarea } from "@heroui/input";

import { EyeIcon, EyeSlashIcon } from "~components/icons";
import { Skeleton } from "~components/skeleton";

import { Button } from "./button";
import type { FieldError, MutationsProp } from "./utils";
import { cn, getErrorState, getMutationLoading } from "./utils";

export const SkeletonInput: React.FC<
	Omit<React.ComponentProps<typeof InputRaw | typeof Textarea>, "ref"> & {
		multiline?: boolean;
		skeletonClassName?: string;
	}
> = ({ multiline, startContent, skeletonClassName, ...props }) => {
	const Component = multiline ? Textarea : InputRaw;
	return (
		<Component
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
};

type Props = Omit<
	React.ComponentProps<typeof InputRaw | typeof Textarea>,
	"ref"
> & {
	ref?: React.Ref<HTMLInputElement & HTMLTextAreaElement>;
	fieldError?: FieldError;
	mutation?: MutationsProp;
	multiline?: boolean;
};

export const Input: React.FC<Props> = ({
	fieldError,
	mutation,
	endContent,
	multiline,
	ref,
	...props
}) => {
	const [visible, setVisible] = React.useState(false);
	const switchValue = React.useCallback(() => setVisible((prev) => !prev), []);
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
};
