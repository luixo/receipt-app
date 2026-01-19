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
import { View } from "~components/view";

import type { Props } from "./input";

const input = tv({
	slots: {
		base: "",
		input: "flex-1",
		sideContent:
			"absolute top-0 bottom-0 z-10 flex-row items-start justify-center gap-2",
		topContent: "absolute top-0 left-0 z-10 -mx-1",
		label: "text-normal",
	},
	variants: {
		labelPlacement: {
			outside: {},
			"outside-left": {
				base: "flex-row",
				label: "py-3",
			},
			"outside-top": {},
			inside: {
				label: "text-muted text-sm",
			},
		},
		size: {
			sm: {
				input: "text-sm",
				sideContent: "py-3",
			},
			md: {
				input: "text-base",
				sideContent: "py-5",
			},
			lg: {
				label: "text-lg",
				input: "text-xl",
				sideContent: "py-7",
			},
		},
		color: {
			default: {
				input: "group-data-[has-value=true]:text-default-foreground",
			},
			primary: {
				input:
					"bg-primary-100 border-primary-100 active:bg-primary-50 text-primary focus:bg-primary-50 placeholder:text-primary",
				label: "text-primary",
			},
			secondary: {
				input:
					"bg-secondary-100 border-secondary-100 text-secondary active:bg-secondary-50 focus:bg-secondary-50 placeholder:text-secondary",
				label: "text-secondary",
			},
			success: {
				input:
					"bg-success-100 border-success-100 text-success-600 dark:text-success active:bg-success-50 focus:bg-success-50 placeholder:text-success-600 dark:placeholder:text-success",
				label: "text-success-600 dark:text-success",
			},
			warning: {
				input:
					"bg-warning-100 border-warning-100 text-warning-600 dark:text-warning placeholder:text-warning-600 dark:placeholder:text-warning active:bg-warning-50 focus:bg-warning-50 placeholder:text-warning-600 dark:placeholder:text-warning",
				label: "text-warning-600 dark:text-warning",
			},
			danger: {
				input:
					"bg-danger-100 border-danger-100 text-danger dark:text-danger-500 placeholder:text-danger dark:placeholder:text-danger-500 active:bg-danger-50 focus:bg-danger-50 placeholder:text-danger dark:placeholder:text-danger-500",
				label: "text-danger dark:text-danger-500",
			},
		},
		multiline: {
			true: {
				input: "min-h-24",
			},
			false: {},
		},
		location: {
			start: {
				sideContent: "left-0 pl-3",
			},
			end: {
				sideContent: "right-0 pr-3",
			},
		},
	},
	defaultVariants: {
		color: "default",
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
}: Omit<Props, "ref" | "mutation" | "fieldError"> & {
	ref?: React.RefObject<TextInput | null>;
}) => {
	const [startContentWidth, setStartContentWidth] = React.useState(0);
	const [endContentWidth, setEndContentWidth] = React.useState(0);
	const [topContentHeight, setTopContentHeight] = React.useState(0);
	const slots = input({ color, labelPlacement, size });
	const labelElement = label ? (
		<TextField.Label className={slots.label()}>{label}</TextField.Label>
	) : null;
	const padding = size === "lg" ? 18 : size === "md" ? 12 : 8;
	return (
		<TextField
			isRequired={isRequired}
			isDisabled={isDisabled}
			isInvalid={Boolean(errorMessage)}
			className={slots.base({ className })}
		>
			{labelPlacement === "inside" ? null : labelElement}
			<View className="flex-1">
				<View className="relative flex flex-1 flex-col">
					{labelPlacement === "inside" ? (
						<View
							onLayout={(layout) => setTopContentHeight(layout.height)}
							className={slots.topContent()}
							style={{ marginStart: startContentWidth }}
						>
							{labelElement}
						</View>
					) : null}
					<View className="relative flex flex-1 flex-row">
						{startContent ? (
							<View
								onLayout={(layout) => setStartContentWidth(layout.width)}
								className={slots.sideContent({ location: "start" })}
								style={{ marginTop: topContentHeight }}
							>
								{startContent}
								<View />
							</View>
						) : null}
						<TextField.Input
							ref={ref}
							placeholder={placeholder}
							multiline={multiline}
							numberOfLines={4}
							value={value}
							readOnly={isReadOnly}
							onChangeText={onValueChange}
							defaultValue={defaultValue}
							className={slots.input({ multiline })}
							clearButtonMode={isClearable ? "while-editing" : undefined}
							style={{
								paddingStart: startContentWidth,
								paddingEnd: endContentWidth,
								paddingTop: padding + topContentHeight,
								paddingBottom: padding,
							}}
							onBlur={onBlur}
							autoComplete={autoComplete}
							autoFocus={autoFocus}
							autoCapitalize={autoCapitalize}
							{...(type ? keyboardTypeMapping[type] : {})}
						/>
						{endContent ? (
							<View
								onLayout={(layout) => setEndContentWidth(layout.width)}
								className={slots.sideContent({ location: "end" })}
								style={{ marginTop: topContentHeight }}
							>
								<View />
								{isClearable && Platform.OS !== "ios" ? (
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
					{description ? (
						<TextField.Description>{description}</TextField.Description>
					) : null}
					{errorMessage ? (
						<TextField.ErrorMessage>{errorMessage}</TextField.ErrorMessage>
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
	...props
}) => {
	const innerRef = React.useRef<TextInput>(null);
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
	});
	React.useImperativeHandle(
		ref,
		() => ({ focus: () => innerRef.current?.focus() }),
		[],
	);
	return (
		<InnerInput
			ref={innerRef}
			{...props}
			{...passwordVisibilityProps}
			{...mutationErrorProps}
		/>
	);
};
