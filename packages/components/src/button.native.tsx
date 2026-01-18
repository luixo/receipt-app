import React, { Children } from "react";

import { ButtonGroupProvider, useButtonGroupContext } from "@heroui/react";
import { button, buttonGroup } from "@heroui/theme";

import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { ButtonGroupProps, ButtonProps } from "./button.base";
import { FormContext, formHandlersById } from "./form.native";

export const Button: React.FC<ButtonProps> = ({
	children,
	onPress: onPressRaw,
	type,
	form,
	size,
	color,
	variant,
	radius,
	fullWidth,
	isDisabled,
	isIconOnly,
	className,
	as,
	isLoading,
	spinnerPlacement = "start",
	startContent,
	endContent,
	...props
}) => {
	const formContext = React.use(FormContext);
	const groupContext = useButtonGroupContext();
	// Types actually lie
	const sureGroupContext =
		(groupContext as typeof groupContext | undefined) || {};
	const onPress = React.useCallback(() => {
		if (type === "submit") {
			if (form) {
				formHandlersById[form]?.();
			} else {
				formContext.submitHandler();
			}
		}
		onPressRaw?.();
	}, [onPressRaw, formContext, type, form]);
	const spinner = <View className="size-4 rounded-full bg-red-500" />;
	const Component = as ?? View;
	return (
		<Component
			className={button({
				size: sureGroupContext.size || size,
				color: sureGroupContext.color || color,
				variant: sureGroupContext.variant || variant,
				radius: sureGroupContext.radius || radius,
				fullWidth,
				isDisabled: sureGroupContext.isDisabled || isDisabled,
				isInGroup: Boolean(groupContext),
				isIconOnly: sureGroupContext.isIconOnly || isIconOnly,
				className: cn("flex-row", className),
			})}
			role="button"
			onPress={isDisabled ? undefined : onPress}
			{...props}
		>
			{startContent}
			{isLoading && spinnerPlacement === "start" ? spinner : null}
			{isLoading && isIconOnly ? null : typeof children === "string" ||
			  Children.toArray(children).every(
					(child) => typeof child === "string",
			  ) ? (
				<Text>{children as string}</Text>
			) : (
				children
			)}
			{isLoading && spinnerPlacement === "end" ? spinner : null}
			{endContent}
		</Component>
	);
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
	size,
	color,
	variant,
	radius,
	isDisabled,
	isIconOnly,
	fullWidth,
	className,
	children,
}) => (
	<View className={buttonGroup({ fullWidth, className })}>
		<ButtonGroupProvider
			value={{
				size,
				color,
				variant,
				radius,
				isDisabled,
				isIconOnly,
				fullWidth,
			}}
		>
			{children}
		</ButtonGroupProvider>
	</View>
);
