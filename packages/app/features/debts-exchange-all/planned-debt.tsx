import React from "react";
import { View } from "react-native";

import { Spinner } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

import { Input } from "app/components/base/input";
import { Text } from "app/components/base/text";
import { useInputController } from "app/hooks/use-input-controller";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";

type InputProps = {
	currencyCode: CurrencyCode;
} & Pick<Props, "selectedCurrencyCode" | "form">;

const RateInput: React.FC<InputProps> = ({
	selectedCurrencyCode,
	currencyCode,
	form,
}) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: `${selectedCurrencyCode}.${currencyCode}` as `${CurrencyCode}.${CurrencyCode}`,
		type: "number",
		defaultValue: 0,
	});
	return (
		<Input
			key={`${selectedCurrencyCode}.${currencyCode}`}
			{...bindings}
			aria-label={currencyCode}
			required
			type="number"
			min="0"
			fieldError={inputState.error}
		/>
	);
};

type Props = {
	selectedCurrencyCode: CurrencyCode;
	form: UseFormReturn<Record<CurrencyCode, Record<CurrencyCode, number>>>;
	ratesLoading: boolean;
	currencyCode: CurrencyCode;
	amount: number;
	note: string;
};

export const PlannedDebt: React.FC<Props> = ({
	selectedCurrencyCode,
	form,
	ratesLoading,
	amount,
	currencyCode,
	note,
}) => {
	const selected = selectedCurrencyCode === currencyCode;
	const rate = <>{ratesLoading && !selected ? <Spinner /> : note}</>;
	return (
		<View className="gap-1">
			<View className="flex-row gap-4">
				<Text
					className={`flex-1 self-center ${
						amount >= 0 ? "text-success" : "text-danger"
					}`}
				>
					{selected && ratesLoading ? (
						<Spinner />
					) : (
						`${round(amount)} ${currencyCode}`
					)}
				</Text>
				<View className="flex-1">
					{selected ? null : (
						<RateInput
							// Reload input on selected currency code change will rerun useInputController
							// Otherwise the hook will run `register` method which will propagate current value
							// to the new form key
							key={selectedCurrencyCode}
							form={form}
							selectedCurrencyCode={selectedCurrencyCode}
							currencyCode={currencyCode}
						/>
					)}
				</View>
				<View className="flex-1 max-md:hidden">{rate}</View>
			</View>
			<View className="md:hidden">{rate}</View>
		</View>
	);
};
