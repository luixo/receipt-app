import React from "react";

import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import { Button, ButtonGroup } from "~components/button";

type ButtonProps = {
	selected: boolean;
	currencyCode: CurrencyCode;
	setSelectedCurrencyCode: (currencyCode: CurrencyCode) => void;
};

const CurrencyButton: React.FC<ButtonProps> = ({
	selected,
	currencyCode,
	setSelectedCurrencyCode,
}) => {
	const select = React.useCallback(() => {
		setSelectedCurrencyCode(currencyCode);
	}, [setSelectedCurrencyCode, currencyCode]);
	const formattedCurrency = useFormattedCurrency(currencyCode);
	return (
		<Button variant={selected ? undefined : "ghost"} onClick={select}>
			{formattedCurrency}
		</Button>
	);
};

type Props = {
	selectedCurrencyCode?: CurrencyCode;
	aggregatedDebts: { currencyCode: CurrencyCode; sum: number }[];
	isLoading: boolean;
	onSelectOther: () => void;
} & Pick<ButtonProps, "setSelectedCurrencyCode">;

export const CurrenciesGroup: React.FC<Props> = ({
	selectedCurrencyCode,
	aggregatedDebts,
	isLoading,
	setSelectedCurrencyCode,
	onSelectOther,
}) => {
	const isSelectedOther =
		selectedCurrencyCode !== undefined &&
		!isLoading &&
		!aggregatedDebts.some((debt) => debt.currencyCode === selectedCurrencyCode);
	const otherCurrency = useFormattedCurrency(selectedCurrencyCode);
	return (
		<ButtonGroup color="primary" className="flex-wrap">
			{aggregatedDebts.map((debt) => (
				<CurrencyButton
					key={debt.currencyCode}
					selected={selectedCurrencyCode === debt.currencyCode}
					currencyCode={debt.currencyCode}
					setSelectedCurrencyCode={setSelectedCurrencyCode}
				/>
			))}
			<Button
				variant={isSelectedOther ? undefined : "ghost"}
				onClick={onSelectOther}
			>
				{isSelectedOther ? otherCurrency : "Other"}
			</Button>
		</ButtonGroup>
	);
};
