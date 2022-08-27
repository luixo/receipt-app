import React from "react";

import { Text } from "@nextui-org/react";

import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { Grid } from "app/components/grid";
import { Link } from "app/components/link";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { TRPCQuerySuccessResult } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Props = {
	userId: UsersId;
	debt: TRPCQuerySuccessResult<"debts.get-user">["data"][number];
};

export const UserDebtPreview: React.FC<Props> = ({ userId, debt }) => {
	const currency = useFormattedCurrency(debt.currency);
	const statusDebt = React.useMemo(() => ({ ...debt, userId }), [debt, userId]);
	return (
		<Link href={`/debts/${debt.id}`} color="text">
			<Grid.Container gap={2}>
				<Grid defaultCol={2} lessSmCol={5} lessMdCol={3}>
					<Text color={debt.amount >= 0 ? "success" : "error"}>
						{debt.amount} {currency}
					</Text>
				</Grid>
				<Grid defaultCol={2} lessSmCol={5} lessMdCol={3}>
					{new Date(debt.timestamp).toLocaleDateString()}
				</Grid>
				<Grid defaultCol={2}>
					<DebtSyncStatus debt={statusDebt} size={24} />
				</Grid>
				<Grid defaultCol={6} lessSmCol={12} lessMdCol={4} lessSmCss={{ pt: 0 }}>
					{debt.note}
				</Grid>
			</Grid.Container>
		</Link>
	);
};
