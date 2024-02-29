import React from "react";
import { View } from "react-native";

import { Input as InputRaw } from "@nextui-org/react";
import type { FieldError } from "react-hook-form";

import type { TRPCMutationResult } from "~app/trpc";
import { CheckMark, EyeIcon, EyeSlashIcon } from "~components/icons";

import { Button, tv } from "./nextui";

const input = tv({
	base: "",
});

type Props = Omit<
	React.ComponentProps<typeof InputRaw>,
	"value" | "errorMessage"
> & {
	fieldError?: FieldError;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mutation?: TRPCMutationResult<any> | TRPCMutationResult<any>[];
	value?: string | number;
	errorMessage?: React.ReactNode;
	saveProps?: {
		title?: string;
		isHidden?: boolean;
		onClick: () => void;
	};
};

export const Input = React.forwardRef<HTMLInputElement, Props>(
	(
		{
			className,
			isInvalid,
			fieldError,
			errorMessage,
			mutation,
			isDisabled,
			value,
			type,
			endContent,
			saveProps,
			...props
		},
		ref,
	) => {
		const [isVisible, setVisible] = React.useState(false);
		const switchValue = React.useCallback(
			() => setVisible((prev) => !prev),
			[],
		);
		const mutations = Array.isArray(mutation)
			? mutation
			: mutation
			? [mutation]
			: [];
		const isWarning = Boolean(fieldError);
		const isError = Boolean(mutations.find(({ error }) => error)) || isInvalid;
		const isMutationLoading = mutations.some(({ isPending }) => isPending);
		return (
			<InputRaw
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				ref={ref as any}
				{...props}
				value={value?.toString()}
				isDisabled={isMutationLoading || isDisabled}
				color={isWarning ? "warning" : isError ? "danger" : undefined}
				description={
					fieldError?.message ||
					mutations.map(({ error }) => error?.message).find(Boolean) ||
					errorMessage
				}
				classNames={{
					base: input({ className }),
					description: isWarning ? "text-warning" : undefined,
				}}
				type={type === "password" ? (isVisible ? undefined : "password") : type}
				endContent={
					<View className="flex-row gap-2">
						{endContent}
						{type === "password" ? (
							<Button variant="light" isIconOnly>
								{isVisible ? (
									<EyeSlashIcon onClick={switchValue} size={24} />
								) : (
									<EyeIcon onClick={switchValue} size={24} />
								)}
							</Button>
						) : null}
						{saveProps && !saveProps.isHidden ? (
							<Button
								title={saveProps.title}
								variant="light"
								isLoading={isMutationLoading}
								isDisabled={isWarning || isError}
								onClick={saveProps.onClick}
								isIconOnly
								color="success"
							>
								<CheckMark size={24} />
							</Button>
						) : null}
					</View>
				}
			/>
		);
	},
);
