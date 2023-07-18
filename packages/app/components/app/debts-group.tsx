import React from "react";

import { styled } from "@nextui-org/react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";

const Debts = styled("div", {
	display: "flex",
});

const Debt = styled("div", {
	whiteSpace: "nowrap",

	variants: {
		direction: {
			out: {
				color: "$error",
			},
			in: {
				color: "$success",
			},
		},
	},
});

const Delimiter = styled("span", { mx: "$4" });

type DebtElement = { currencyCode: CurrencyCode; sum: number };

const DebtGroupElement: React.FC<DebtElement> = ({ currencyCode, sum }) => {
	const currency = useFormattedCurrency(currencyCode);
	return (
		<Debt key={currencyCode} direction={sum >= 0 ? "in" : "out"}>
			{round(Math.abs(sum))} {currency}
		</Debt>
	);
};

type Props = {
	debts: DebtElement[];
} & React.ComponentProps<typeof Debts>;

export const DebtsGroup: React.FC<Props> = ({ debts, ...props }) => (
	<Debts {...props}>
		{debts.map(({ currencyCode, sum }, index) => (
			<React.Fragment key={currencyCode}>
				{index === 0 ? null : <Delimiter>•</Delimiter>}
				<DebtGroupElement currencyCode={currencyCode} sum={sum} />
			</React.Fragment>
		))}
	</Debts>
);
