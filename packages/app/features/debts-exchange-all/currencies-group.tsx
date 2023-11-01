import React from "react";

import { Button, styled } from "@nextui-org/react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { trpc } from "app/trpc";
import type { Currency, CurrencyCode } from "app/utils/currency";

const Wrapper = styled("div", {
	display: "flex",
	justifyContent: "center",
});

type ButtonProps = {
	selected: boolean;
	currencyCode: CurrencyCode;
	setSelectedCurrency: (currency: Currency) => void;
};

const CurrencyButton: React.FC<ButtonProps> = ({
	selected,
	currencyCode,
	setSelectedCurrency,
}) => {
	const currenciesListQuery = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false } },
	);
	const select = React.useCallback(() => {
		if (currenciesListQuery.status !== "success") {
			return;
		}
		const matchedCurrency = currenciesListQuery.data.find(
			(currency) => currency.code === currencyCode,
		);
		if (!matchedCurrency) {
			return;
		}
		setSelectedCurrency(matchedCurrency);
	}, [setSelectedCurrency, currenciesListQuery, currencyCode]);
	const currency = useFormattedCurrency(currencyCode);
	return (
		<Button
			ghost={!selected}
			onClick={select}
			disabled={currenciesListQuery.status !== "success"}
		>
			{currency}
		</Button>
	);
};

type Props = {
	selectedCurrencyCode?: CurrencyCode;
	aggregatedDebts: { currencyCode: CurrencyCode; sum: number }[];
	onSelectOther: () => void;
} & Pick<ButtonProps, "setSelectedCurrency">;

export const CurrenciesGroup: React.FC<Props> = ({
	selectedCurrencyCode,
	aggregatedDebts,
	setSelectedCurrency,
	onSelectOther,
}) => {
	const isSelectedOther =
		selectedCurrencyCode !== undefined &&
		!aggregatedDebts.some((debt) => debt.currencyCode === selectedCurrencyCode);
	const otherCurrency = useFormattedCurrency(selectedCurrencyCode);
	return (
		<Wrapper>
			<Button.Group color="primary" bordered auto>
				{aggregatedDebts.map((debt) => (
					<CurrencyButton
						key={debt.currencyCode}
						selected={selectedCurrencyCode === debt.currencyCode}
						currencyCode={debt.currencyCode}
						setSelectedCurrency={setSelectedCurrency}
					/>
				))}
				<Button ghost={!isSelectedOther} onClick={onSelectOther}>
					{isSelectedOther ? otherCurrency : "Other"}
				</Button>
			</Button.Group>
		</Wrapper>
	);
};
