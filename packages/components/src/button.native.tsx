import React from "react";

import { Button as ButtonRaw } from "heroui-native/button";

import { Text } from "~components/text";
import { TextWrapper } from "~components/text.native";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { ButtonGroupProps, ButtonProps } from "./button.base";
import { FormContext, formHandlersById } from "./form.native";

const ButtonGroupProvider = React.createContext<Pick<
	ButtonProps,
	"size" | "variant" | "radius" | "isDisabled" | "isIconOnly" | "fullWidth"
> | null>(null);

const ButtonGroupIndexContent = React.createContext<{
	index: number;
	total: number;
}>({ index: 0, total: 0 });

const getButtonClassName = (
	props: ButtonProps,
	group: Partial<ButtonProps>,
	child: { index: number; total: number },
) => {
	const radius = props.radius ?? group.radius;
	return cn(
		(props.fullWidth ?? group.fullWidth) && "w-full",
		{
			"rounded-none": radius === "none",
			"rounded-sm": radius === "sm",
			"rounded-md": radius === "md",
			"rounded-lg": radius === "lg",
			"rounded-full": radius === "full",
		},
		child.total > 0 && child.index > 0 && "rounded-l-none",
		child.total > 0 && child.index < child.total - 1 && "rounded-r-none",
		props.className,
	);
};

export const Button: React.FC<ButtonProps> = (props) => {
	const {
		children,
		onPress: onPressRaw,
		type,
		form,
		size,
		variant,
		radius,
		fullWidth,
		isDisabled: isDisabledRaw,
		isIconOnly,
		className: rawClassName,
		as,
		isLoading,
		startContent,
		endContent,
		...viewProps
	} = props;
	const formContext = React.use(FormContext);
	const groupContext = React.use(ButtonGroupProvider);
	const sureGroupContext = groupContext || {};
	const childContext = React.use(ButtonGroupIndexContent);
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
	if (as) {
		const Component = as;
		return <Component {...props} />;
	}
	const isDisabled = isDisabledRaw ?? sureGroupContext.isDisabled;
	const className = getButtonClassName(
		{ variant, radius, fullWidth, className: rawClassName },
		sureGroupContext,
		childContext,
	);
	return (
		<ButtonRaw
			size={size ?? sureGroupContext.size}
			variant={variant ?? sureGroupContext.variant}
			isDisabled={isDisabled}
			isIconOnly={isIconOnly ?? sureGroupContext.isIconOnly}
			onPress={isDisabled ? undefined : onPress}
			feedbackVariant="scale-ripple"
			className={className}
			{...viewProps}
		>
			<TextWrapper>
				{startContent}
				{isLoading ? spinner : null}
				{isIconOnly && (isLoading || !children) ? null : typeof children ===
						"string" ||
				  // The only way to find that out
				  // oxlint-disable-next-line react/no-react-children
				  React.Children.toArray(children).every(
						(child) => typeof child === "string",
				  ) ? (
					<ButtonRaw.Label>
						<Text>{children as string}</Text>
					</ButtonRaw.Label>
				) : (
					children
				)}
				{endContent}
			</TextWrapper>
		</ButtonRaw>
	);
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
	size,
	variant,
	radius,
	isDisabled,
	isIconOnly,
	fullWidth,
	className,
	children,
}) => {
	// oxlint-disable-next-line react/no-react-children
	const totalChildren = React.Children.count(children);
	const buttonGroupContext = React.useMemo(
		() => ({
			size,
			variant,
			radius,
			isDisabled,
			isIconOnly,
			fullWidth,
		}),
		[size, variant, radius, isDisabled, isIconOnly, fullWidth],
	);
	return (
		<View className={cn("flex-row", fullWidth && "w-full", className)}>
			<ButtonGroupProvider value={buttonGroupContext}>
				{/* oxlint-disable-next-line react/no-react-children */}
				{React.Children.map(children, (child, index) => (
					// oxlint-disable-next-line react/jsx-no-constructed-context-values
					<ButtonGroupIndexContent value={{ index, total: totalChildren }}>
						{child}
					</ButtonGroupIndexContent>
				))}
			</ButtonGroupProvider>
		</View>
	);
};
