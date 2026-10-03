import React from "react";

import {
	Description,
	FieldError as FieldErrorRaw,
	InputGroup,
	Input as InputRaw,
	Label,
	TextArea,
	TextField,
} from "@heroui/react";

import { Icon } from "~components/icons";
import { cn } from "~components/utils";
import type { ViewReactNode } from "~components/view";

import { useMutationErrors, usePasswordVisibility } from "./input.base";
import type { FieldError, MutationsProp } from "./utils";

export type InputHandler = {
	focus: () => void;
	blur: () => void;
};

export type Props = {
	value?: string;
	variant?: React.ComponentProps<typeof InputRaw>["variant"];
	onValueChange?: (value: string) => void;
	className?: string;
	placeholder?: string;
	isDisabled?: boolean;
	isReadOnly?: boolean;
	isRequired?: boolean;
	isInvalid?: boolean;
	defaultValue?: string;
	isClearable?: boolean;
	name?: string;
	autoFocus?: boolean;
	"aria-label"?: string;
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	onBlur?: () => void;
	onFocus?: () => void;
	onPress?: () => void;
	onClear?: () => void;
	onKeyPress?: (key: string) => void;
	errorMessage?: string;
	ref?: React.RefObject<InputHandler>;
	label?: string;
	hideLabel?: boolean;
	description?: string;
	startContent?: ViewReactNode;
	endContent?: ViewReactNode;
	fieldError?: FieldError;
	mutation?: MutationsProp;
	multiline?: boolean;
	type?: React.ComponentProps<"input">["type"];
	autoComplete?: "email" | "name" | "new-password" | "username";
	continuousMutations?: boolean;
	inputClassName?: string;
	testID?: string;
};

export const Input: React.FC<Props> = ({
	variant,
	fieldError,
	mutation,
	multiline,
	ref,
	onPress,
	onKeyPress,
	continuousMutations,
	inputClassName,
	testID,
	value,
	onValueChange,
	defaultValue,
	placeholder,
	name,
	isRequired,
	isReadOnly,
	autoFocus,
	label,
	hideLabel,
	errorMessage,
	description: descriptionProp,
	startContent,
	endContent: endContentProp,
	className,
	isClearable,
	onBlur,
	onFocus,
	autoCapitalize,
	autoComplete,
	isDisabled: disabledProp,
	isInvalid,
	...props
}) => {
	const innerRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
	React.useImperativeHandle(
		ref,
		() => ({
			focus: () => innerRef.current?.focus(),
			blur: () => innerRef.current?.blur(),
		}),
		[],
	);
	const { endContent, type } = usePasswordVisibility({
		type: props.type,
		endContent: endContentProp,
	});
	const {
		isDisabled,
		className: mutationClassName,
		description,
	} = useMutationErrors({
		isDisabled: disabledProp,
		mutation,
		fieldError,
		continuousMutations,
	});
	const fieldProps = {
		value,
		defaultValue,
		name,
		isRequired,
		isReadOnly,
		isDisabled,
		isInvalid,
		className: cn(mutationClassName, className),
		onChange: onValueChange,
	};
	const inputProps: (React.ComponentProps<typeof InputRaw> &
		React.ComponentProps<typeof TextArea>) & { "data-testid"?: string } = {
		ref: innerRef as React.Ref<HTMLInputElement> &
			React.Ref<HTMLTextAreaElement>,
		variant,
		placeholder,
		autoFocus,
		autoCapitalize,
		autoComplete,
		onBlur,
		onFocus,
		"aria-label": props["aria-label"],
		"data-testid": testID,
		className: inputClassName,
		onClick: onPress,
		onKeyDown: (e: React.KeyboardEvent) => onKeyPress?.(e.key),
		type: type ?? "text",
	};
	const hasGroup = Boolean(
		startContent || endContentProp || isClearable || props.type === "password",
	);
	return (
		<TextField {...fieldProps}>
			{label && !hideLabel ? <Label>{label}</Label> : null}
			{multiline ? (
				<TextArea {...inputProps} />
			) : hasGroup ? (
				<InputGroup variant={inputProps.variant}>
					{startContent ? (
						<InputGroup.Prefix>{startContent}</InputGroup.Prefix>
					) : null}
					<InputGroup.Input {...inputProps} />
					<InputGroup.Suffix className="gap-2">
						{endContent}
						{value && isClearable ? (
							<Icon name="close" onClick={() => onValueChange?.("")} />
						) : null}
					</InputGroup.Suffix>
				</InputGroup>
			) : (
				<InputRaw {...inputProps} />
			)}
			{descriptionProp || description ? (
				<Description className="whitespace-pre">
					{description || descriptionProp}
				</Description>
			) : null}
			{errorMessage ? <FieldErrorRaw>{errorMessage}</FieldErrorRaw> : null}
		</TextField>
	);
};
