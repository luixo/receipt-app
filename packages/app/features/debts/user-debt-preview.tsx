import React from "react";

import { styled } from "@nextui-org/react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

const Wrapper = styled("div", {
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
	debt: TRPCQueryOutput<"debts.get-by-users">[UsersId][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currency = useFormattedCurrency(debt.currency);
	return (
		<Wrapper key={debt.currency} direction={debt.sum >= 0 ? "in" : "out"}>
			{Math.abs(debt.sum)} {currency}
		</Wrapper>
	);
};
