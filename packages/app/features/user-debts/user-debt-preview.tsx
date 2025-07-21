import type React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { DebtsId, UsersId } from "~db/models";

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

const OnlyWithConnectedAccount = suspendedFallback<
	React.PropsWithChildren<{ userId: UsersId }>
>(({ userId, children }) => {
	const trpc = useTRPC();
	const { data: user } = useSuspenseQuery(
		trpc.users.get.queryOptions({ id: userId }),
	);
	if (user.connectedAccount) {
		return <>{children}</>;
	}
	return null;
}, null);

export const UserDebtPreview = suspendedFallback<{
	debtId: DebtsId;
	resolved: boolean;
}>(
	({ debtId, resolved }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const locale = useLocale();
		const { formatPlainDate } = useFormat();
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
						<OnlyWithConnectedAccount userId={debt.userId}>
							<DebtSyncStatus debt={debt} theirDebt={debt.their} />
						</OnlyWithConnectedAccount>
					}
					note={<Text>{debt.note}</Text>}
				/>
			</Link>
		);
	},
	<UserDebtPreviewSkeleton />,
);
