import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Checkbox } from "~components/checkbox";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";
import type { DebtId, UserId } from "~db/ids";

type DebtShape = {
	amount: ViewReactNode;
	timestamp: ViewReactNode;
	synced: ViewReactNode;
	note: ViewReactNode;
	startContent?: ViewReactNode;
};

const UserDebtPreviewShape: React.FC<
	DebtShape & React.ComponentProps<typeof View>
> = ({
	amount,
	timestamp,
	note,
	synced,
	className,
	startContent,
	...props
}) => (
	<View
		className={cn("flex flex-1 flex-col items-stretch", className)}
		{...props}
	>
		<View className="flex-1 flex-row gap-2 p-2 max-sm:p-3">
			{startContent}
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
		startContent={
			<View className="size-6 shrink-0">
				<Checkbox
					isDisabled
					color="secondary"
					classNames={{ wrapper: "me-0" }}
				/>
			</View>
		}
		amount={<Skeleton className="h-6 w-16 rounded" />}
		timestamp={<Skeleton className="h-6 w-24 rounded" />}
		synced={<Skeleton className="size-6 rounded" />}
		note={<Skeleton className="h-6 w-32 rounded" />}
	/>
);

const OnlyWithConnectedAccount = suspendedFallback<
	React.PropsWithChildren<{ userId: UserId }>
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
	debtId: DebtId;
	resolved: boolean;
	isSelected: boolean;
	onValueChange: (nextValue: boolean) => void;
}>(
	({ debtId, resolved, isSelected, onValueChange }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const locale = useLocale();
		const { formatPlainDate } = useFormat();
		const lastMutationState = useTrpcMutationState<"debts.remove">(
			trpc.debts.remove.mutationKey(),
			(vars) => vars.id === debtId,
		);
		const isRemoving = lastMutationState?.status === "pending";
		return (
			<Link
				to="/debts/$id"
				params={{ id: debt.id }}
				className={cn(
					"overflow-hidden py-2 first-of-type:rounded-t-2xl last-of-type:rounded-b-2xl",
					isSelected ? "bg-secondary/20" : "",
				)}
			>
				<UserDebtPreviewShape
					startContent={
						<View className="size-6 shrink-0">
							<Checkbox
								isSelected={isSelected}
								onValueChange={isRemoving ? undefined : onValueChange}
								isDisabled={isRemoving}
								color="secondary"
								classNames={{ wrapper: "me-0" }}
							/>
						</View>
					}
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
