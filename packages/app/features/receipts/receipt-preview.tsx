import type React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";

import { HighlightText } from "~app/components/highlight-text";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Badge } from "~components/badge";
import { Checkbox } from "~components/checkbox";
import { InfoIcon, KeyIcon } from "~components/icons";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import { cn } from "~components/utils";
import type { ReceiptId } from "~db/ids";
import type { Interval } from "~utils/array";
import { round } from "~utils/math";

import {
	ReceiptPreviewSyncIcon,
	skeletonReceiptPreviewSyncIcon,
} from "./receipt-preview-sync-icon";

const ReceiptPreviewShape: React.FC<
	{
		title: React.ReactNode;
		checkbox: React.ReactNode;
		sum: React.ReactNode;
		icon: React.ReactNode;
		infoTooltip?: React.ReactNode;
	} & React.ComponentProps<typeof View>
> = ({ title, checkbox, sum, icon, className, infoTooltip, ...props }) => {
	const checkboxComponent = (
		<View className="flex min-w-8 shrink-0 items-center justify-center">
			{checkbox}
		</View>
	);
	return (
		<View
			className={cn(
				"overflow-hidden first-of-type:rounded-t-2xl last-of-type:rounded-b-2xl",
				className,
			)}
			{...props}
		>
			<View className="flex-row gap-2">
				<View className="flex items-center justify-center">
					{checkboxComponent}
				</View>
				<Text className="flex-[6] overflow-hidden p-2">{title}</Text>
				<Tooltip
					content={infoTooltip}
					isDisabled={!infoTooltip}
					className="box-content flex flex-1 p-2"
				>
					<InfoIcon
						className={cn(
							"text-primary cursor-pointer self-center opacity-75",
							infoTooltip ? undefined : "hidden",
						)}
						size={24}
					/>
				</Tooltip>
				<Text className="flex-[2] flex-row justify-end self-center p-2 text-right">
					{sum}
				</Text>
				<View className="flex-1 flex-row items-center justify-center p-2 max-sm:hidden">
					{icon}
				</View>
			</View>
		</View>
	);
};

export const ReceiptPreviewSkeleton = () => (
	<ReceiptPreviewShape
		title={
			<View className="flex flex-col items-start gap-1">
				<Skeleton className="h-5 w-48 rounded" />
				<Skeleton className="h-4 w-14 rounded" />
			</View>
		}
		checkbox={
			<Checkbox isDisabled color="secondary" classNames={{ wrapper: "me-0" }} />
		}
		sum={<Skeleton className="h-5 w-16 rounded" />}
		icon={skeletonReceiptPreviewSyncIcon}
	/>
);

export const ReceiptPreview = suspendedFallback<{
	id: ReceiptId;
	highlights: Interval[];
	isSelected: boolean;
	onValueChange: (nextValue: boolean) => void;
	matchedItems: TRPCQueryOutput<"receipts.getPaged">["items"][number]["matchedItems"];
	filterQuery: string;
}>(
	({
		id,
		highlights,
		isSelected,
		onValueChange,
		matchedItems,
		filterQuery,
	}) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const { data: receipt } = useSuspenseQuery(
			trpc.receipts.get.queryOptions({ id }),
		);
		const { formatPlainDate } = useFormat();
		const lastMutationState = useTrpcMutationState<"receipts.remove">(
			trpc.receipts.remove.mutationKey(),
			(vars) => vars.id === id,
		);
		const isRemoving = lastMutationState?.status === "pending";
		const locale = useLocale();
		const isOwner = receipt.selfUserId === receipt.ownerUserId;
		const emptyItems = receipt.items.filter(
			(item) => item.consumers.length === 0,
		);
		const title = (
			<Link
				className="flex flex-col items-start"
				to="/receipts/$id"
				params={{ id: receipt.id }}
			>
				<View className="flex flex-row items-center gap-2">
					<Tooltip
						content={t("receipt.emptyItems", { amount: emptyItems.length })}
						isDisabled={emptyItems.length === 0}
					>
						<Badge
							content=""
							color="warning"
							placement="top-right"
							isInvisible={emptyItems.length === 0}
							isDot
							className="translate-x-full"
						>
							<Text>
								{filterQuery ? (
									<HighlightText intervals={highlights}>
										{receipt.name}
									</HighlightText>
								) : (
									receipt.name
								)}
							</Text>
						</Badge>
					</Tooltip>
					{isOwner ? <KeyIcon className="shrink-0" size={12} /> : null}
				</View>
				<Text className="text-default-400 text-xs">
					{formatPlainDate(receipt.issued)}
				</Text>
			</Link>
		);
		const sum = round(
			receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
		);
		return (
			<ReceiptPreviewShape
				className={isSelected ? "bg-secondary/20" : undefined}
				title={title}
				checkbox={
					<Checkbox
						isSelected={isSelected}
						onValueChange={isRemoving ? undefined : onValueChange}
						isDisabled={isRemoving}
						color="secondary"
						classNames={{ wrapper: "me-0" }}
					/>
				}
				infoTooltip={
					matchedItems.length !== 0 ? (
						<View>
							{matchedItems.map(
								({ id: itemId, highlights: itemHighlights }) => {
									const matchedItem = receipt.items.find(
										(item) => item.id === itemId,
									);
									if (!matchedItem) {
										return (
											<Text key={itemId}>
												{t("receipt.matchedItem.notFound")}
											</Text>
										);
									}
									return (
										<Text key={itemId}>
											<Trans
												t={t}
												i18nKey="receipt.matchedItem.found"
												components={{
													name: (
														<HighlightText intervals={itemHighlights}>
															{matchedItem.name}
														</HighlightText>
													),
												}}
											/>
										</Text>
									);
								},
							)}
						</View>
					) : null
				}
				sum={
					<Text className="font-medium">
						{formatCurrency(locale, receipt.currencyCode, sum)}
					</Text>
				}
				icon={<ReceiptPreviewSyncIcon receipt={receipt} />}
			/>
		);
	},
	<ReceiptPreviewSkeleton />,
);
