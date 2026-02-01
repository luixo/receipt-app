import React from "react";

// We currently reuse the styles from button / buttonGroup of the web components
// eslint-disable-next-line no-restricted-syntax
import { button, buttonGroup } from "@heroui/react";
import { Button as ButtonRaw } from "heroui-native";

import { Text } from "~components/text";
import { TextWrapper } from "~components/text.native";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { ButtonGroupProps, ButtonProps } from "./button.base";
import { FormContext, formHandlersById } from "./form.native";

const ButtonGroupProvider = React.createContext<Pick<
	ButtonProps,
	| "size"
	| "color"
	| "variant"
	| "radius"
	| "isDisabled"
	| "isIconOnly"
	| "fullWidth"
> | null>(null);

const baseButtonClasses = button.base;

// This is needed for tailwind to find `rounded-s-medimm` -> `rounded-l-medium` change
// rounded-s and rounded-e are not supported on native yet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const classesNeeded = [
	"rounded-l-none",
	"rounded-r-none",
	"rounded-l-small",
	"rounded-r-small",
	"rounded-l-medium",
	"rounded-r-medium",
	"rounded-l-large",
	"rounded-r-large",
];

const ButtonGroupIndexContent = React.createContext<{
	index: number;
	total: number;
}>({ index: 0, total: 0 });

export const Button: React.FC<ButtonProps> = (props) => {
	const {
		children,
		onPress: onPressRaw,
		type,
		form,
		size,
		color,
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
		onLayout,
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
	const className = button({
		variant: variant ?? sureGroupContext.variant,
		color: color ?? sureGroupContext.color,
		fullWidth: fullWidth ?? sureGroupContext.fullWidth,
		radius: radius ?? sureGroupContext.radius ?? "md",
		isInGroup: Boolean(groupContext),
		isDisabled,
		className: rawClassName,
		// We forcefully want to ignore size properties of a web heroui button
		size: "undefined" as unknown as undefined,
		isIconOnly: false,
	})
		.split(" ")
		.filter((element) => !baseButtonClasses.includes(element))
		.filter((element) => {
			if (childContext.total === 0) {
				return true;
			}
			if (childContext.index === 0) {
				return !element.includes("last:");
			}
			if (childContext.index === childContext.total - 1) {
				return !element.includes("first:");
			}
			return !element.includes("last:") && !element.includes("first:");
		})
		.map((element) =>
			element
				.replace("border-medium", "border-2")
				.replace("data-[hover=true]", "active")
				.replace("first:", "")
				.replace("last:", "")
				.replace("rounded-s", "rounded-l")
				.replace("rounded-e", "rounded-r"),
		)
		.join(" ");
	return (
		<ButtonRaw
			size={size ?? sureGroupContext.size}
			isDisabled={isDisabled}
			isIconOnly={isIconOnly ?? sureGroupContext.isIconOnly}
			onPress={isDisabled ? undefined : onPress}
			pressableFeedbackVariant="ripple"
			className={className}
			onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout) : undefined}
			{...viewProps}
		>
			<TextWrapper className={className}>
				{startContent}
				{isLoading ? spinner : null}
				{isLoading && isIconOnly ? null : typeof children === "string" ||
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
	color,
	variant,
	radius,
	isDisabled,
	isIconOnly,
	fullWidth,
	className,
	children,
}) => {
	const totalChildren = React.Children.count(children);
	return (
		<View
			className={buttonGroup({
				fullWidth,
				className: cn("flex-row", className),
			})}
		>
			<ButtonGroupProvider
				value={React.useMemo(
					() => ({
						size,
						color,
						variant,
						radius,
						isDisabled,
						isIconOnly,
						fullWidth,
					}),
					[size, color, variant, radius, isDisabled, isIconOnly, fullWidth],
				)}
			>
				{React.Children.map(children, (child, index) => (
					// eslint-disable-next-line react/jsx-no-constructed-context-values
					<ButtonGroupIndexContent value={{ index, total: totalChildren }}>
						{child}
					</ButtonGroupIndexContent>
				))}
			</ButtonGroupProvider>
		</View>
	);
};
