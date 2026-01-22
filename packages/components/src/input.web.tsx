import React from "react";

import { Input as InputRaw, Textarea } from "@heroui/input";

import type { ViewReactNode } from "~components/view";

import { useMutationErrors, usePasswordVisibility } from "./input.base";
import type { FieldError, MutationsProp } from "./utils";
import { cn } from "./utils";

export type InputHandler = {
	focus: () => void;
	blur: () => void;
};

export type Props = Pick<
	React.ComponentProps<typeof InputRaw>,
	| "value"
	| "onValueChange"
	| "className"
	| "placeholder"
	| "color"
	| "isDisabled"
	| "isReadOnly"
	| "isRequired"
	| "defaultValue"
	| "isClearable"
	| "name"
	| "size"
	| "autoFocus"
	| "aria-label"
> & {
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	onBlur?: () => void;
	onPress?: () => void;
	onKeyPress?: (key: string) => void;
	errorMessage?: string;
	ref?: React.RefObject<InputHandler>;
	label?: string;
	description?: string;
	startContent?: ViewReactNode;
	endContent?: ViewReactNode;
	fieldError?: FieldError;
	mutation?: MutationsProp;
	multiline?: boolean;
	type?: React.ComponentProps<"input">["type"];
	autoComplete?: "email" | "name" | "new-password" | "username";
	continuousMutations?: boolean;
	labelPlacement?: "outside" | "inside" | "outside-left";
	variant?: "flat" | "bordered";
};

export const Input: React.FC<Props> = ({
	fieldError,
	mutation,
	multiline,
	ref,
	onPress,
	onKeyPress,
	continuousMutations,
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
		endContent: props.endContent,
	});
	const { isDisabled, color, description } = useMutationErrors({
		isDisabled: props.isDisabled,
		color: props.color,
		mutation,
		fieldError,
		continuousMutations,
	});
	return (
		<InputRaw
			as={multiline ? Textarea : undefined}
			ref={innerRef as React.RefObject<HTMLInputElement | null>}
			{...props}
			onClick={onPress}
			onKeyDown={(e) => onKeyPress?.(e.key)}
			isDisabled={isDisabled}
			color={color}
			description={description}
			classNames={{
				description: cn(
					"whitespace-pre",
					color === "warning" ? "text-warning" : undefined,
				),
			}}
			type={type}
			endContent={endContent}
		/>
	);
};
