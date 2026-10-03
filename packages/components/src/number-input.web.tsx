import React from "react";

import { Description, Label, NumberField } from "@heroui/react";

import type { InputHandler, Props as InputProps } from "~components/input";
import { cn, getErrorState, getMutationLoading } from "~components/utils";
import { View } from "~components/view";

export type Props = {
	ref?: React.RefObject<InputHandler>;
	fractionDigits: number;
	formatOptions?: Intl.NumberFormatOptions;
	defaultValue?: number;
	value?: number;
	onValueChange?: (nextValue: number) => void;
	minValue?: number;
	maxValue?: number;
	isInvalid?: boolean;
	showStepper?: boolean;
	onKeyPress?: (key: string) => void;
} & Pick<
	InputProps,
	| "onBlur"
	| "name"
	| "variant"
	| "startContent"
	| "endContent"
	| "isDisabled"
	| "isReadOnly"
	| "isRequired"
	| "className"
	| "label"
	| "errorMessage"
	| "mutation"
	| "fieldError"
	| "continuousMutations"
	| "aria-label"
>;

export const NumberInput: React.FC<Props> = ({
	className,
	fieldError,
	variant,
	mutation,
	continuousMutations = false,
	fractionDigits,
	formatOptions,
	ref,
	onKeyPress,
	...props
}) => {
	const innerRef = React.useRef<HTMLInputElement>(null);
	React.useImperativeHandle(
		ref,
		() => ({
			focus: () => innerRef.current?.focus(),
			blur: () => innerRef.current?.blur(),
		}),
		[],
	);
	const isMutationLoading = getMutationLoading(mutation);
	const { isWarning, isError, errors } = getErrorState({
		mutation,
		fieldError,
	});
	const isSSR = typeof window === "undefined";
	return (
		<NumberField
			value={props.value}
			defaultValue={props.defaultValue}
			onChange={props.onValueChange}
			name={props.name}
			minValue={props.minValue}
			maxValue={props.maxValue}
			isRequired={props.isRequired}
			isReadOnly={props.isReadOnly}
			aria-label={props["aria-label"]}
			isDisabled={
				(continuousMutations ? false : isMutationLoading) || props.isDisabled
			}
			isInvalid={errors.length !== 0 || props.isInvalid}
			className={className}
			step={10 ** -fractionDigits}
			variant={variant}
			formatOptions={
				isSSR
					? // iPhone make some format options mismatch on hydration
						// see https://github.com/adobe/react-spectrum/issues/8503
						{ maximumFractionDigits: 0, ...formatOptions }
					: { maximumFractionDigits: fractionDigits, ...formatOptions }
			}
		>
			{props.label ? <Label>{props.label}</Label> : null}
			<NumberField.Group className="flex flex-row">
				{props.startContent ? (
					<View className="flex-row items-center px-2 gap-2">
						{props.startContent}
					</View>
				) : null}
				{props.showStepper ? <NumberField.DecrementButton /> : null}
				<NumberField.Input
					ref={innerRef}
					onBlur={props.onBlur}
					onKeyDown={(e) => onKeyPress?.(e.key)}
				/>
				{props.showStepper ? <NumberField.IncrementButton /> : null}
				{props.endContent ? (
					<View className="flex-row items-center px-2 gap-2">{props.endContent}</View>
				) : null}
			</NumberField.Group>
			{errors.length === 0 && !props.errorMessage ? null : (
				<Description
					className={cn(
						"whitespace-pre",
						isWarning && "text-warning",
						isError && "text-danger",
					)}
				>
					{errors.join("\n") || props.errorMessage}
				</Description>
			)}
		</NumberField>
	);
};
