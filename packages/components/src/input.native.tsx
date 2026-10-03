import React from "react";
import type { TextInput } from "react-native";
import { Platform } from "react-native";

import { Description } from "heroui-native/description";
import { FieldError } from "heroui-native/field-error";
import { Input as InputRaw } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { TextField } from "heroui-native/text-field";
import { tv } from "tailwind-variants";

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
		outer: "min-w-[320px]",
		base: "",
		input:
			"flex-1 border-transparent bg-transparent p-0 text-base leading-[20px] shadow-none",
		wrapper:
			"bg-field border-field-border h-12 justify-center rounded-2xl border-2 px-3 py-2",
		innerWrapper: "flex-row items-center justify-center",
		sideContent: "max-h-6 flex-row items-center justify-center gap-2",
		label: "text-normal",
		description: "",
	},
	variants: {
		variant: {
			primary: {
				wrapper: "bg-default",
			},
			secondary: {
				wrapper: "bg-input-group",
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
				errorMessage: "text-warning",
			},
			false: {},
		},
		multiline: {
			true: {
				input: "min-h-24",
			},
			false: {},
		},
	},
	defaultVariants: {
		variant: "primary",
		multiline: false,
	},
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
		autoCapitalize: "none",
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
	onBlur,
	onFocus,
	autoFocus,
	autoCapitalize,
	onPress,
	onKeyPress,
	"aria-label": ariaLabel,
	variant,
	inputClassName,
}: Omit<Props, "ref" | "mutation" | "fieldError"> & {
	ref?: React.RefObject<TextInput | null>;
}) => {
	const [focus, setFocus] = React.useState(autoFocus ?? false);
	const isInvalid = Boolean(errorMessage);
	const slots = input({
		isFocus: focus,
		isInvalid,
		multiline,
		variant,
	});
	const shouldRenderClearable = isClearable && Platform.OS !== "ios";
	return (
		<View onPress={onPress} className={slots.outer({ className })}>
			<TextField
				isRequired={isRequired}
				isDisabled={isDisabled}
				isInvalid={isInvalid}
				className={slots.base()}
			>
				{label ? (
					<Label>
						<Text className={slots.label()}>{label}</Text>
					</Label>
				) : null}
				<View className="flex-1 shrink-0">
					<View className={slots.wrapper()}>
						<View className={slots.innerWrapper()}>
							{startContent ? (
								<View className={slots.sideContent({ className: "pr-1.5" })}>
									{startContent}
								</View>
							) : null}
							<InputRaw
								ref={ref}
								aria-label={ariaLabel}
								placeholder={placeholder}
								multiline={multiline}
								numberOfLines={4}
								value={value}
								readOnly={isReadOnly}
								onChangeText={onValueChange}
								defaultValue={defaultValue}
								className={slots.input({ className: inputClassName })}
								clearButtonMode={isClearable ? "while-editing" : undefined}
								onBlur={() => {
									onBlur?.();
									setFocus(false);
								}}
								onFocus={() => {
									onFocus?.();
									setFocus(true);
								}}
								onPressIn={() => onPress?.()}
								onKeyPress={(e) => onKeyPress?.(e.nativeEvent.key)}
								autoComplete={autoComplete}
								autoFocus={autoFocus}
								autoCapitalize={autoCapitalize}
								variant={variant}
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
						<Description>
							<Text className={slots.description()}>{description}</Text>
						</Description>
					) : null}
					{errorMessage ? (
						<FieldError>
							<Text>{errorMessage}</Text>
						</FieldError>
					) : null}
				</View>
			</TextField>
		</View>
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
