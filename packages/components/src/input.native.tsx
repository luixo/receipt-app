import React from "react";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

import { tv } from "@heroui/react";
import { TextField } from "heroui-native";

import { Icon } from "~components/icons";
import {
	useMutationErrors,
	usePasswordVisibility,
} from "~components/input.base";
import { Text } from "~components/text";
import { View } from "~components/view";

import type { Props } from "./input";

const input = tv({
	slots: {
		base: "",
		input: "flex-1 border-transparent bg-transparent p-0 shadow-none",
		wrapper: "bg-field border-field justify-center rounded-2xl border-2 px-3",
		innerWrapper: "flex-row items-center justify-center",
		sideContent: "flex-row items-start justify-center gap-2",
		label: "text-normal",
	},
	variants: {
		variant: {
			bordered: {
				wrapper: "border-default-200",
			},
			flat: {
				wrapper: "shadow-field",
			},
		},
		labelPlacement: {
			outside: {},
			"outside-left": {
				base: "flex-row",
			},
			inside: {
				label: "text-muted text-sm",
			},
		},
		isFocus: {
			true: {},
			false: {},
		},
		isInvalid: {
			true: {
				wrapper: "border-danger",
			},
			false: {},
		},
		size: {
			sm: {
				wrapper: "h-10 py-1.5",
				input: "text-sm leading-[18px]",
			},
			md: {
				wrapper: "h-12 py-2",
				input: "text-base leading-[20px]",
			},
			lg: {
				wrapper: "h-15 py-2.5",
				label: "text-lg",
				input: "text-xl leading-[24px]",
			},
		},
		color: {
			default: {
				input: "group-data-[has-value=true]:text-default-foreground",
			},
			primary: {
				wrapper:
					"bg-primary-100 border-primary-100 active:bg-primary-50 focus:bg-primary-50",
				input: "text-primary placeholder:text-primary",
				label: "text-primary",
			},
			secondary: {
				wrapper:
					"bg-secondary-100 border-secondary-100 active:bg-secondary-50 focus:bg-secondary-50",
				input: "text-secondary placeholder:text-secondary",
				label: "text-secondary",
			},
			success: {
				wrapper: "bg-success-100 border-success-100",
				input:
					"text-success-600 dark:text-success placeholder:text-success-600 dark:placeholder:text-success",
				label: "text-success-600 dark:text-success",
			},
			warning: {
				wrapper:
					"bg-warning-100 border-warning-100 active:bg-warning-50 focus:bg-warning-50",
				input:
					"text-warning-600 dark:text-warning placeholder:text-warning-600 dark:placeholder:text-warning",
				label: "text-warning-600 dark:text-warning",
			},
			danger: {
				wrapper:
					"bg-danger-100 border-danger-100 active:bg-danger-50 focus:bg-danger-50",
				input:
					"text-danger dark:text-danger-500 placeholder:text-danger dark:placeholder:text-danger-500",
				label: "text-danger dark:text-danger-500",
			},
		},
		multiline: {
			true: {
				input: "min-h-24",
			},
			false: {},
		},
	},
	defaultVariants: {
		size: "md",
		color: "default",
		multiline: false,
		labelPlacement: "inside",
		variant: "flat",
	},
	compoundVariants: [
		{
			size: "sm",
			labelPlacement: "inside",
			class: {
				wrapper: "h-14",
			},
		},
		{
			size: "md",
			labelPlacement: "inside",
			class: {
				wrapper: "h-16",
			},
		},
		{
			size: "lg",
			labelPlacement: "inside",
			class: {
				wrapper: "h-19",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "default",
			class: {
				wrapper: "border-default-400",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "primary",
			class: {
				wrapper: "border-primary-400",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "secondary",
			class: {
				wrapper: "border-secondary-400",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "success",
			class: {
				wrapper: "border-success-400",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "warning",
			class: {
				wrapper: "border-warning-400",
			},
		},
		{
			isFocus: true,
			variant: "bordered",
			color: "danger",
			class: {
				wrapper: "border-danger-400",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "default",
			class: {
				wrapper: "bg-default-200 border-default-200",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "primary",
			class: {
				wrapper: "bg-primary-200 border-primary-200",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "secondary",
			class: {
				wrapper: "bg-secondary-200 border-secondary-200",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "success",
			class: {
				wrapper: "bg-success-200 border-success-200",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "warning",
			class: {
				wrapper: "bg-warning-200 border-warning-200",
			},
		},
		{
			isFocus: true,
			variant: "flat",
			color: "danger",
			class: {
				wrapper: "bg-danger-200 border-danger-200",
			},
		},
	],
});

const keyboardTypeMapping: Partial<
	Record<
		React.HTMLInputTypeAttribute,
		Partial<React.ComponentProps<typeof TextInput>>
	>
> = {
	text: {
		keyboardType: "default",
	},
	email: {
		keyboardType: "email-address",
		autoComplete: "email",
	},
	tel: {
		keyboardType: "phone-pad",
	},
	url: {
		keyboardType: "url",
	},
	number: {
		keyboardType: "numeric",
	},
	password: {
		keyboardType: Platform.OS === "android" ? "visible-password" : "default",
		secureTextEntry: true,
	},
	search: {
		keyboardType: "default",
		returnKeyType: "search",
	},
	date: {
		keyboardType: "numeric",
	},
	time: {
		keyboardType: "numeric",
	},
	"datetime-local": {
		keyboardType: "numeric",
	},
	month: {
		keyboardType: "numeric",
	},
	week: {
		keyboardType: "numeric",
	},
};

const InnerInput = ({
	ref,
	value,
	onValueChange,
	className,
	placeholder,
	color,
	isDisabled,
	isReadOnly,
	label,
	startContent,
	endContent,
	multiline,
	isRequired,
	errorMessage,
	description,
	defaultValue,
	type,
	isClearable,
	autoComplete,
	labelPlacement,
	onBlur,
	size,
	autoFocus,
	autoCapitalize,
	onPress,
	onKeyPress,
	"aria-label": ariaLabel,
	variant,
}: Omit<Props, "ref" | "mutation" | "fieldError"> & {
	ref?: React.RefObject<TextInput | null>;
}) => {
	const [focus, setFocus] = React.useState(autoFocus ?? false);
	const isInvalid = Boolean(errorMessage);
	const slots = input({
		color,
		labelPlacement,
		size,
		isFocus: focus,
		isInvalid,
		multiline,
		variant,
	});
	const labelElement = label ? (
		<TextField.Label>
			<Text className={slots.label()}>{label}</Text>
		</TextField.Label>
	) : null;
	const shouldRenderClearable = isClearable && Platform.OS !== "ios";
	return (
		<TextField
			isRequired={isRequired}
			isDisabled={isDisabled}
			isInvalid={isInvalid}
			className={slots.base({ className })}
		>
			{labelPlacement === "inside" ? null : labelElement}
			<View className="flex-1">
				<View onPress={onPress}>
					<View className={slots.wrapper()}>
						{labelPlacement === "inside" ? labelElement : null}
						<View className={slots.innerWrapper()}>
							{startContent ? (
								<View className={slots.sideContent({ className: "pr-1.5" })}>
									{startContent}
								</View>
							) : null}
							<TextField.Input
								ref={ref}
								aria-label={ariaLabel}
								placeholder={placeholder}
								multiline={multiline}
								numberOfLines={4}
								value={value}
								readOnly={isReadOnly}
								onChangeText={onValueChange}
								defaultValue={defaultValue}
								className={slots.input()}
								clearButtonMode={isClearable ? "while-editing" : undefined}
								onBlur={() => {
									onBlur?.();
									setFocus(false);
								}}
								onKeyPress={(e) => onKeyPress?.(e.nativeEvent.key)}
								onFocus={() => setFocus(true)}
								autoComplete={autoComplete}
								autoFocus={autoFocus}
								autoCapitalize={autoCapitalize}
								{...(type ? keyboardTypeMapping[type] : {})}
							/>
							{endContent || shouldRenderClearable ? (
								<View className={slots.sideContent({ className: "pl-1.5" })}>
									{shouldRenderClearable ? (
										<Icon
											name="close"
											className="size-6"
											onClick={() => onValueChange?.("")}
										/>
									) : null}
									{endContent}
								</View>
							) : null}
						</View>
					</View>
					{description ? (
						<TextField.Description>
							<Text>{description}</Text>
						</TextField.Description>
					) : null}
					{errorMessage ? (
						<TextField.ErrorMessage>
							<Text>{errorMessage}</Text>
						</TextField.ErrorMessage>
					) : null}
				</View>
			</View>
		</TextField>
	);
};

export const Input: React.FC<Props> = ({
	fieldError,
	mutation,
	ref,
	endContent,
	type,
	continuousMutations,
	...props
}) => {
	const innerRef = React.useRef<TextInput>(null);
	React.useImperativeHandle(
		ref,
		() => ({
			focus: () => innerRef.current?.focus(),
			blur: () => innerRef.current?.blur(),
		}),
		[],
	);
	const passwordVisibilityProps = usePasswordVisibility({
		type,
		endContent,
	});
	const mutationErrorProps = useMutationErrors({
		isDisabled: props.isDisabled,
		color: props.color,
		description: props.description,
		mutation,
		fieldError,
		continuousMutations,
	});
	return (
		<InnerInput
			ref={innerRef}
			{...props}
			{...passwordVisibilityProps}
			{...mutationErrorProps}
		/>
	);
};
