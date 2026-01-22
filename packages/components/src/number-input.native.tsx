import React from "react";

import { useLocale } from "~app/hooks/use-locale";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { View } from "~components/view";

import type { Props } from "./number-input";

export const NumberInput: React.FC<Props> = ({
	fractionDigits,
	formatOptions,
	defaultValue,
	value,
	onValueChange,
	minValue,
	maxValue,
	hideStepper,
	onKeyPress,
	endContent,
	isDisabled,
	isReadOnly,
	...props
}) => {
	const locale = useLocale();
	const formatNumber = React.useCallback(
		(input?: number) =>
			input === undefined
				? ""
				: new Intl.NumberFormat(locale, {
						maximumFractionDigits: fractionDigits,
						...formatOptions,
					}).format(input),
		[locale, formatOptions, fractionDigits],
	);
	const [rawInput, setRawInput] = React.useState<string>(() =>
		formatNumber(value ?? defaultValue),
	);

	const validateNumber = React.useCallback(
		(input: number) =>
			Math.min(Math.max(minValue ?? -Infinity, input), maxValue ?? Infinity),
		[maxValue, minValue],
	);
	const getNumberValue = React.useCallback(
		(input: string) => {
			const commitedInput = input.replaceAll(",", ".");
			if (commitedInput === "") {
				return Number.NaN;
			}
			const parsedNumber = Number.parseFloat(commitedInput);
			if (Number.isNaN(parsedNumber)) {
				// Bail out if not a number
				return Number.NaN;
			}
			if (parsedNumber < 0 && typeof minValue === "number" && minValue >= 0) {
				// Bail out if negative number
				return Number.NaN;
			}
			return validateNumber(parsedNumber);
		},
		[minValue, validateNumber],
	);
	const commit = React.useCallback(
		(input: number) => {
			if (Number.isNaN(input)) {
				setRawInput(formatNumber(value));
				return;
			}
			if (input !== value) {
				onValueChange?.(input);
			}
			setRawInput(formatNumber(input));
		},
		[formatNumber, onValueChange, value],
	);
	const step = 10 ** -fractionDigits;
	const increment = React.useCallback(
		() => commit(validateNumber(getNumberValue(rawInput || "0") + step)),
		[commit, validateNumber, getNumberValue, rawInput, step],
	);
	const decrement = React.useCallback(
		() => commit(validateNumber(getNumberValue(rawInput || "0") - step)),
		[commit, validateNumber, getNumberValue, rawInput, step],
	);
	return (
		<Input
			{...props}
			onBlur={() => commit(getNumberValue(rawInput))}
			value={rawInput}
			onValueChange={setRawInput}
			onKeyPress={(key) => {
				onKeyPress?.(key);
				if (key === "Enter" || key === "Esc") {
					commit(getNumberValue(rawInput));
				}
			}}
			isDisabled={isDisabled}
			isReadOnly={isReadOnly}
			endContent={
				endContent || !hideStepper || isDisabled || isReadOnly ? (
					<>
						{endContent}
						<View className="flex gap-2">
							<View className="rotate-180">
								<Icon
									name="chevron-down"
									onClick={increment}
									className="size-3"
								/>
							</View>
							<Icon
								name="chevron-down"
								onClick={decrement}
								className="size-3"
							/>
						</View>
					</>
				) : null
			}
		/>
	);
};
