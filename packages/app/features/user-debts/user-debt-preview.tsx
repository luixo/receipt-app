import React from "react";

import { Text } from "@nextui-org/react";

import { Grid } from "app/components/grid";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { TRPCQuerySuccessResult } from "app/trpc";

type Props = {
	debt: TRPCQuerySuccessResult<"debts.get-user">["data"][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currency = useFormattedCurrency(debt.currency);
	return (
		<Grid.Container gap={2}>
			<Grid defaultCol={2} lessSmCol={6} lessMdCol={3}>
				<Text color={debt.amount >= 0 ? "success" : "error"}>
					{debt.amount} {currency}
				</Text>
			</Grid>
			<Grid defaultCol={2} lessSmCol={6} lessMdCol={3}>
				{new Date(debt.timestamp).toLocaleDateString()}
			</Grid>
			<Grid defaultCol={8} lessSmCol={12} lessMdCol={6} lessSmCss={{ pt: 0 }}>
				{debt.note}
			</Grid>
		</Grid.Container>
	);
};
