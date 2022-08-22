import React from "react";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Props = {
	debt: TRPCQueryOutput<"debts.get-by-users">[UsersId][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currency = useFormattedCurrency(debt.currency);
	return (
		<span key={debt.currency}>
			{debt.sum} {currency}
		</span>
	);
};
