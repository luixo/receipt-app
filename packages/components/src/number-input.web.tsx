import React from "react";

import { NumberInput as NumberInputRaw } from "@heroui/number-input";
import { useIsSSR } from "@react-aria/ssr";

import type { InputHandler, Props as InputProps } from "~components/input";
import { cn, getErrorState, getMutationLoading } from "~components/utils";

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
	hideStepper?: boolean;
	onKeyPress?: (key: string) => void;
} & Pick<
	InputProps,
	| "labelPlacement"
	| "onBlur"
	| "name"
	| "startContent"
	| "endContent"
	| "isDisabled"
	| "isReadOnly"
	| "isRequired"
	| "className"
	| "label"
	| "variant"
	| "color"
	| "errorMessage"
	| "mutation"
	| "fieldError"
	| "continuousMutations"
	| "aria-label"
>;

export const NumberInput: React.FC<Props> = ({
	className,
	fieldError,
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
	const isSSR = useIsSSR();
	return (
		<NumberInputRaw
			ref={innerRef}
			{...props}
			isDisabled={
				(continuousMutations ? false : isMutationLoading) || props.isDisabled
			}
			color={isWarning ? "warning" : isError ? "danger" : undefined}
			description={errors.join("\n")}
			isInvalid={errors.length !== 0 || props.isInvalid}
			classNames={{
				base: className,
				description: cn(
					"whitespace-pre",
					isWarning ? "text-warning" : undefined,
				),
			}}
			step={10 ** -fractionDigits}
			formatOptions={
				isSSR
					? // iPhone make some format options mismatch on hydration
						// see https://github.com/adobe/react-spectrum/issues/8503
						{ maximumFractionDigits: 0, ...formatOptions }
					: { maximumFractionDigits: fractionDigits, ...formatOptions }
			}
			onKeyDown={(e) => onKeyPress?.(e.key)}
		/>
	);
};
