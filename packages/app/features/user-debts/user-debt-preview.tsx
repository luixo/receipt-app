import type React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { QueryErrorMessage } from "~app/components/error-message";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { DebtsId } from "~db/models";

type DebtShape = {
	amount: React.ReactNode;
	timestamp: React.ReactNode;
	synced: React.ReactNode;
	note: React.ReactNode;
};

const UserDebtPreviewShape: React.FC<
	DebtShape & React.ComponentProps<typeof View>
> = ({ amount, timestamp, note, synced, className, ...props }) => (
	<View
		className={cn("flex flex-1 flex-col items-stretch", className)}
		{...props}
	>
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
	resolved: boolean;
};

const UserDebtPreviewInner: React.FC<InnerProps> = ({ query, resolved }) => {
	const trpc = useTRPC();
	const debt = query.data;
	const locale = useLocale();
	const { formatPlainDate } = useFormat();
	const userQuery = useQuery(trpc.users.get.queryOptions({ id: debt.userId }));
	return (
		<Link to="/debts/$id" params={{ id: debt.id }}>
			<UserDebtPreviewShape
				className={resolved ? "opacity-50" : undefined}
				amount={
					<Text
						className={debt.amount >= 0 ? "text-success" : "text-danger"}
						testID="preview-debt-amount"
					>
						{formatCurrency(locale, debt.currencyCode, Math.abs(debt.amount))}
					</Text>
				}
				timestamp={<Text>{formatPlainDate(debt.timestamp)}</Text>}
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
	resolved: boolean;
};

export const UserDebtPreview: React.FC<Props> = ({ debtId, resolved }) => {
	const trpc = useTRPC();
	const query = useQuery(trpc.debts.get.queryOptions({ id: debtId }));
	if (query.status === "pending") {
		return <UserDebtPreviewSkeleton />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtPreviewInner query={query} resolved={resolved} />;
};
