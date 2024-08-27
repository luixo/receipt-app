import type React from "react";
import { View } from "react-native";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { QueryErrorMessage } from "~app/components/error-message";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import { type TRPCQuerySuccessResult, trpc } from "~app/trpc";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import type { DebtsId } from "~db/models";

type DebtShape = {
	amount: React.ReactNode;
	timestamp: React.ReactNode;
	synced: React.ReactNode;
	note: React.ReactNode;
};

const UserDebtPreviewShape: React.FC<DebtShape> = ({
	amount,
	timestamp,
	note,
	synced,
}) => (
	<View className="flex flex-1 flex-col items-stretch">
		<View className="flex-1 flex-row gap-2 p-2 max-sm:p-3">
			<View className="flex-[2]">{amount}</View>
			<View className="flex-[2]">{timestamp}</View>
			<View className="flex-1">{synced}</View>
			<View className="flex-[3] max-sm:hidden">{note}</View>
		</View>
		<View className="p-3 pb-5 sm:hidden">{note}</View>
	</View>
);

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

const UserDebtPreviewInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const currency = useFormattedCurrency(debt.currencyCode);
	const { formatDate } = useSsrFormat();
	return (
		<Link href={`/debts/${debt.id}`}>
			<UserDebtPreviewShape
				amount={
					<Text className={debt.amount >= 0 ? "text-success" : "text-danger"}>
						{Math.abs(debt.amount)} {currency}
					</Text>
				}
				timestamp={<Text>{formatDate(debt.timestamp)}</Text>}
				synced={<DebtSyncStatus debt={debt} />}
				note={<Text>{debt.note}</Text>}
			/>
		</Link>
	);
};

type Props = {
	debtId: DebtsId;
};

export const UserDebtPreview: React.FC<Props> = ({ debtId }) => {
	const query = trpc.debts.get.useQuery({ id: debtId });
	if (query.status === "pending") {
		return (
			<UserDebtPreviewShape
				amount={<Skeleton className="h-6 w-16 rounded" />}
				timestamp={<Skeleton className="h-6 w-24 rounded" />}
				synced={<Skeleton className="size-6 rounded" />}
				note={<Skeleton className="h-6 w-32 rounded" />}
			/>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtPreviewInner query={query} />;
};
