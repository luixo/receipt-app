import type React from "react";

import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { Card } from "~components/card";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

export const SkeletonDebtIntention: React.FC<{ children?: ViewReactNode }> = ({
	children,
}) => (
	<Card bodyClassName="gap-4">
		<View className="flex-row gap-2">
			<Skeleton className="h-6 w-20 rounded-md" />
			<Skeleton className="h-6 w-28 rounded-md" />
		</View>
		<View className="flex-row items-center gap-2">
			<Skeleton className="h-6 w-20 rounded-md" />
		</View>
		<View className="flex-row justify-between">
			<View className="flex-row gap-1">
				<Icon name="sync" className="size-6" />
				<Skeleton className="h-6 w-32 rounded-md" />
			</View>
			<View className="max-md:hidden">{children}</View>
		</View>
		<View className="self-end md:hidden">{children}</View>
	</Card>
);

type Intentions = TRPCQueryOutput<"debtIntentions.getAll">;

type Props = {
	intention: Intentions[number];
	children?: ViewReactNode;
};

export const DebtIntention: React.FC<Props> = ({ intention, children }) => {
	const { formatPlainDate, formatZonedDateTime } = useFormat();
	const locale = useLocale();
	const intentionDataComponent = (
		<View className="flex-row gap-2">
			<Text className={intention.amount >= 0 ? "text-success" : "text-danger"}>
				{formatCurrency(
					locale,
					intention.currencyCode,
					Math.abs(intention.amount),
				)}
			</Text>
			<Text>{formatPlainDate(intention.timestamp)}</Text>
		</View>
	);
	return (
		<Card bodyClassName="gap-4">
			{intention.current ? (
				<View className="flex-row gap-2 max-sm:flex-col">
					<View className="flex-row gap-2">
						<Text
							className={
								intention.current.amount >= 0 ? "text-success" : "text-danger"
							}
						>
							{formatCurrency(
								locale,
								intention.current.currencyCode,
								Math.abs(intention.current.amount),
							)}
						</Text>
						<Text>{formatPlainDate(intention.current.timestamp)}</Text>
					</View>
					<Icon name="arrow-right" className="size-6" />
					{intentionDataComponent}
				</View>
			) : (
				intentionDataComponent
			)}
			<View className="flex-row items-center gap-2">
				{intention.receiptId ? (
					<ButtonLink
						to="/receipts/$id"
						params={{ id: intention.receiptId }}
						variant="bordered"
						color="primary"
						isIconOnly
						size="sm"
					>
						<Icon name="receipt" className="size-5" />
					</ButtonLink>
				) : null}
				<Text>{intention.note}</Text>
			</View>
			<View className="flex-row justify-between">
				<View className="flex-row gap-1">
					<Icon name="sync" className="size-6" />
					<Text>{formatZonedDateTime(intention.updatedAt)}</Text>
				</View>
				<View className="max-md:hidden">{children}</View>
			</View>
			<View className="self-end md:hidden">{children}</View>
		</Card>
	);
};
