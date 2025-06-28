import React from "react";

import { useLocale } from "~app/hooks/use-locale";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
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
	const locale = useLocale();
	return (
		<Button variant={selected ? undefined : "ghost"} onPress={select}>
			{getCurrencySymbol(locale, currencyCode)}
		</Button>
	);
};

type Props = {
	selectedCurrencyCode?: CurrencyCode;
	aggregatedDebts: { currencyCode: CurrencyCode; sum: number }[];
	onSelectOther: () => void;
} & Pick<ButtonProps, "setSelectedCurrencyCode">;

export const CurrenciesGroup: React.FC<Props> = ({
	selectedCurrencyCode,
	aggregatedDebts,
	setSelectedCurrencyCode,
	onSelectOther,
}) => {
	const isSelectedOther =
		selectedCurrencyCode !== undefined &&
		!aggregatedDebts.some((debt) => debt.currencyCode === selectedCurrencyCode);
	const locale = useLocale();
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
				onPress={onSelectOther}
			>
				{isSelectedOther
					? getCurrencySymbol(locale, selectedCurrencyCode)
					: "Other"}
			</Button>
		</ButtonGroup>
	);
};
