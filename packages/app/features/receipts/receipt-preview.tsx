import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { Badge } from "~components/badge";
import { KeyIcon } from "~components/icons";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import { round } from "~utils/math";

import {
	ReceiptPreviewSyncIcon,
	ReceiptPreviewSyncIconSkeleton,
} from "./receipt-preview-sync-icon";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreview: React.FC<InnerProps> = ({ receipt }) => {
	const { t } = useTranslation("receipts");
	const { formatDate } = useFormat();
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
				{formatDate(receipt.issued)}
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
	return (
		<View>
			<View className="flex-row gap-2 sm:hidden">
				<Text className="flex-[8] p-2">{title}</Text>
				<Text className="flex-[2] flex-row justify-end p-2 text-right">
					{sumComponent}
				</Text>
			</View>
			<View className="flex-row gap-2">
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
};

export const ReceiptPreviewSkeleton = () => {
	const titleComponent = (
		<View className="flex flex-col items-start gap-1">
			<Skeleton className="h-5 w-48 rounded" />
			<Skeleton className="h-4 w-14 rounded" />
		</View>
	);
	const sumComponent = <Skeleton className="h-5 w-16 rounded" />;
	return (
		<View>
			<View className="flex-row gap-2 sm:hidden">
				<View className="flex-[8] p-2">{titleComponent}</View>
				<View className="flex-[2] flex-row justify-end p-2">
					{sumComponent}
				</View>
			</View>
			<View className="flex-row gap-2">
				<View className="flex-[8] p-2 max-sm:hidden">{titleComponent}</View>
				<View className="flex-[2] flex-row justify-end self-center p-2 max-sm:hidden">
					{sumComponent}
				</View>
				<View className="flex-1 flex-row items-center justify-start p-2 sm:justify-center">
					<ReceiptPreviewSyncIconSkeleton />
				</View>
			</View>
		</View>
	);
};
