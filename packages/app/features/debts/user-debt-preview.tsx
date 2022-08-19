import React from "react";

import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Props = {
	debt: TRPCQueryOutput<"debts.get-by-users">[UsersId]["debts"][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currenciesListQuery = trpc.useQuery(
		["currency.get-list", { locale: "en" }],
		{ ssr: false }
	);
	const currency = currenciesListQuery.data
		? currenciesListQuery.data.list.find(
				(element) => element.code === debt.currency
		  )?.symbol
		: debt.currency;
	return (
		<span key={debt.currency}>
			{debt.sum} {currency}
		</span>
	);
};
