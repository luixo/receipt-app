import type React from "react";
import { View } from "react-native";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { QueryErrorMessage } from "~app/components/error-message";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { type TRPCQuerySuccessResult, trpc } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
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
			<View className="flex-1 empty:hidden">{synced}</View>
			<View className="flex-[3] max-sm:hidden">{note}</View>
		</View>
		<View className="p-3 pb-5 sm:hidden">{note}</View>
	</View>
);

export const UserDebtPreviewSkeleton = () => (
	<UserDebtPreviewShape
		amount={<Skeleton className="h-6 w-16 rounded" />}
		timestamp={<Skeleton className="h-6 w-24 rounded" />}
		synced={<Skeleton className="size-6 rounded" />}
		note={<Skeleton className="h-6 w-32 rounded" />}
	/>
);

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

const UserDebtPreviewInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const locale = useLocale();
	const { formatDate } = useFormat();
	const userQuery = trpc.users.get.useQuery({ id: debt.userId });
	return (
		<Link href={`/debts/${debt.id}`}>
			<UserDebtPreviewShape
				amount={
					<Text
						className={debt.amount >= 0 ? "text-success" : "text-danger"}
						testID="preview-debt-amount"
					>
						{formatCurrency(locale, debt.currencyCode, Math.abs(debt.amount))}
					</Text>
				}
				timestamp={<Text>{formatDate(debt.timestamp)}</Text>}
				synced={
					userQuery.status === "success" && userQuery.data.connectedAccount ? (
						<DebtSyncStatus debt={debt} theirDebt={debt.their} />
					) : null
				}
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
		return <UserDebtPreviewSkeleton />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtPreviewInner query={query} />;
};
