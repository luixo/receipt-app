import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Badge } from "~components/badge";
import { Checkbox } from "~components/checkbox";
import { KeyIcon } from "~components/icons";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import { cn } from "~components/utils";
import type { ReceiptsId } from "~db/models";
import { round } from "~utils/math";

import {
	ReceiptPreviewSyncIcon,
	skeletonReceiptPreviewSyncIcon,
} from "./receipt-preview-sync-icon";

export const ReceiptPreviewSkeleton = () => {
	const titleComponent = (
		<View className="flex flex-col items-start gap-1">
			<Skeleton className="h-5 w-48 rounded" />
			<Skeleton className="h-4 w-14 rounded" />
		</View>
	);
	const sumComponent = <Skeleton className="h-5 w-16 rounded" />;
	const checkboxComponent = (
		<View className="flex size-8 shrink-0 items-center justify-center">
			<Checkbox isDisabled color="secondary" classNames={{ wrapper: "me-0" }} />
		</View>
	);
	return (
		<View>
			<View className="flex-row gap-2 sm:hidden">
				{checkboxComponent}
				<View className="flex-[8] p-2">{titleComponent}</View>
				<View className="flex-[2] flex-row justify-end p-2">
					{sumComponent}
				</View>
			</View>
			<View className="flex-row gap-2">
				<View className="flex items-center justify-center max-sm:hidden">
					{checkboxComponent}
				</View>
				<View className="flex-[8] p-2 max-sm:hidden">{titleComponent}</View>
				<View className="flex-[2] flex-row justify-end self-center p-2 max-sm:hidden">
					{sumComponent}
				</View>
				<View className="flex-1 flex-row items-center justify-start p-2 sm:justify-center">
					{skeletonReceiptPreviewSyncIcon}
				</View>
			</View>
		</View>
	);
};

export const ReceiptPreview = suspendedFallback<{
	id: ReceiptsId;
	isSelected: boolean;
	onValueChange: (nextValue: boolean) => void;
}>(
	({ id, isSelected, onValueChange }) => {
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
							<Text>{receipt.name}</Text>
						</Badge>
					</Tooltip>
					{isOwner ? <KeyIcon size={12} /> : null}
				</View>
				<Text className="text-default-400 text-xs">
					{formatPlainDate(receipt.issued)}
				</Text>
			</Link>
		);
		const sum = round(
			receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
		);
		const sumComponent = (
			<Text className="font-medium">
				{formatCurrency(locale, receipt.currencyCode, sum)}
			</Text>
		);
		const checkboxComponent = (
			<View className="flex min-w-8 shrink-0 items-center justify-center">
				<Checkbox
					isSelected={isSelected}
					onValueChange={isRemoving ? undefined : onValueChange}
					isDisabled={isRemoving}
					color="secondary"
					classNames={{ wrapper: "me-0" }}
				/>
			</View>
		);
		return (
			<View
				className={cn(
					"overflow-hidden first-of-type:rounded-t-2xl last-of-type:rounded-b-2xl",
					isSelected ? "bg-secondary/20" : undefined,
				)}
			>
				<View className="flex-row gap-2 sm:hidden">
					{checkboxComponent}
					<Text className="flex-[8] p-2">{title}</Text>
					<Text className="flex-[2] flex-row justify-end p-2 text-right">
						{sumComponent}
					</Text>
				</View>
				<View className="flex-row gap-2">
					<View className="flex items-center justify-center max-sm:hidden">
						{checkboxComponent}
					</View>
					<Text className="flex-[8] p-2 max-sm:hidden">{title}</Text>
					<Text className="flex-[2] flex-row justify-end self-center p-2 text-right max-sm:hidden">
						{sumComponent}
					</Text>
					<View className="flex-1 flex-row items-center justify-start p-2 sm:justify-center">
						<ReceiptPreviewSyncIcon receipt={receipt} />
					</View>
				</View>
			</View>
		);
	},
	<ReceiptPreviewSkeleton />,
);
