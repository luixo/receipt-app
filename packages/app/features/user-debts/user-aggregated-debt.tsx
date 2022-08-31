import React from "react";

import { styled } from "@nextui-org/react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { Currency } from "app/utils/currency";

const Wrapper = styled("div", {
	display: "flex",
	alignSelf: "center",
	fontSize: "$xl",

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

type Props = {
	amount: number;
	currency: Currency;
};

export const UserAggregatedDebt: React.FC<Props> = ({ amount, currency }) => {
	const formattedCurrency = useFormattedCurrency(currency);
	return (
		<Wrapper direction={amount >= 0 ? "in" : "out"}>
			{Math.abs(amount)} {formattedCurrency}
		</Wrapper>
	);
};
