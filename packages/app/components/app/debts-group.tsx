import React from "react";

import { styled } from "@nextui-org/react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { Currency } from "app/utils/currency";
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

type DebtElement = { currency: Currency; sum: number };

const DebtGroupElement: React.FC<DebtElement> = ({ currency, sum }) => {
	const formattedCurrency = useFormattedCurrency(currency);
	return (
		<Debt key={currency} direction={sum >= 0 ? "in" : "out"}>
			{round(Math.abs(sum))} {formattedCurrency}
		</Debt>
	);
};

type Props = {
	debts: DebtElement[];
} & React.ComponentProps<typeof Debts>;

export const DebtsGroup: React.FC<Props> = ({ debts, ...props }) => (
	<Debts {...props}>
		{debts.map(({ currency, sum }, index) => (
			<React.Fragment key={currency}>
				{index === 0 ? null : <Delimiter>•</Delimiter>}
				<DebtGroupElement key={currency} currency={currency} sum={sum} />
			</React.Fragment>
		))}
	</Debts>
);
