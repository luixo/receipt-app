import React from "react";

import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { Text } from "app/components/base/text";
import { Grid } from "app/components/grid";
import { Link } from "app/components/link";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import type { TRPCQuerySuccessResult } from "app/trpc";

type Props = {
	debt: TRPCQuerySuccessResult<"debts.getUser">["data"][number];
};

export const UserDebtPreview: React.FC<Props> = ({ debt }) => {
	const currency = useFormattedCurrency(debt.currencyCode);
	const { formatDate } = useSsrFormat();
	return (
		<Link href={`/debts/${debt.id}`} color="text">
			<Grid.Container gap={2}>
				<Grid defaultCol={2} lessSmCol={5} lessMdCol={3}>
					<Text className={debt.amount >= 0 ? "text-success" : "text-danger"}>
						{Math.abs(debt.amount)} {currency}
					</Text>
				</Grid>
				<Grid defaultCol={2} lessSmCol={5} lessMdCol={3}>
					{formatDate(debt.timestamp)}
				</Grid>
				<Grid defaultCol={2}>
					<DebtSyncStatus debt={debt} size={24} />
				</Grid>
				<Grid defaultCol={6} lessSmCol={12} lessMdCol={4} lessSmCss={{ pt: 0 }}>
					{debt.note}
				</Grid>
			</Grid.Container>
		</Link>
	);
};
