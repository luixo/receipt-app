import React from "react";

import { Input, Loading, styled } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

import { Text } from "app/components/base/text";
import { Grid } from "app/components/grid";
import { useInputController } from "app/hooks/use-input-controller";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";

const GridContainer = styled(Grid.Container, {
	alignItems: "center",
});

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
			status={inputState.error ? "warning" : undefined}
			helperColor="warning"
			helperText={inputState.error?.message}
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
	return (
		<GridContainer gap={2} css={{ alignItems: "center" }}>
			<Grid defaultCol={4} lessSmCol={6}>
				<Text className={amount >= 0 ? "text-success" : "text-danger"}>
					{selected && ratesLoading ? (
						<Loading />
					) : (
						`${round(amount)} ${currencyCode}`
					)}
				</Text>
			</Grid>
			<Grid defaultCol={4} lessSmCol={6}>
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
			</Grid>
			<Grid defaultCol={4} lessSmCol={12} lessMdCss={{ pt: 0 }}>
				{ratesLoading && !selected ? <Loading /> : note}
			</Grid>
		</GridContainer>
	);
};
