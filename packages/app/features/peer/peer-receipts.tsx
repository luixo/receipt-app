import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	PaginationBlockShape,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { useFormat } from "~app/hooks/use-format";
import { useLocale } from "~app/hooks/use-locale";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import type { Receipt } from "~app/trpc-types";
import { formatCurrency } from "~app/utils/currency";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import { useTRPC } from "~app/utils/trpc";
import { Link } from "~components/link";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { PeerId, ReceiptId } from "~db/ids";
import { round } from "~utils/math";

import { StatusButton } from "../receipts/receipt-preview-sync-icon";

const PeerReceiptDebtStatus: React.FC<
	React.ComponentProps<typeof StatusButton>
> = ({ type }) => (
	<View testID="peer-receipt-debt-status">
		<StatusButton type={type} />
	</View>
);

const PeerReceiptDebtIcon = suspendedFallback<{
	receipt: Receipt;
	peerId: PeerId;
}>(
	({ receipt, peerId }) => {
		const { participantsWithDebts, syncableParticipants } =
			useParticipantsWithDebts(receipt);
		const isOwner = receipt.selfPeerId === receipt.ownerPeerId;
		const isPeerOwner = receipt.ownerPeerId === peerId;
		// Debt with the peer only exists on receipts owned by me or by the peer
		const participant = (() => {
			if (!isOwner && !isPeerOwner) {
				return undefined;
			}
			return participantsWithDebts.find(
				({ peerId: participantPeerId }) =>
					participantPeerId === (isOwner ? peerId : receipt.selfPeerId),
			);
		})();
		if (
			!participant ||
			participant.balance === 0 ||
			!syncableParticipants.includes(participant)
		) {
			return null;
		}
		const ourDebt = participant.currentDebt?.our;
		if (!ourDebt) {
			return <PeerReceiptDebtStatus type="unsynced" />;
		}
		if (
			isDebtInSyncWithReceipt(
				{
					...receipt,
					participantSum: isOwner ? participant.balance : -participant.balance,
				},
				ourDebt,
			)
		) {
			return <PeerReceiptDebtStatus type="synced" />;
		}
		return <PeerReceiptDebtStatus type={isOwner ? "unsynced" : "desynced"} />;
	},
	<Skeleton className="size-6 rounded-sm" />,
);
const PeerReceiptPreviewSkeleton = () => (
	<View
		testID="peer-receipt-preview"
		className="w-full overflow-hidden first-of-type:rounded-t-2xl last-of-type:rounded-b-2xl"
	>
		<View className="flex-row items-center justify-between gap-2">
			<View className="flex flex-col items-start gap-1 p-2">
				<Skeleton className="h-5 w-48 rounded-sm" />
				<Skeleton className="h-4 w-14 rounded-sm" />
			</View>
			<View className="flex-row items-center gap-2 p-2">
				<Skeleton className="h-5 w-16 rounded-sm" />
				<Skeleton className="size-6 rounded-sm" />
			</View>
		</View>
	</View>
);

const PeerReceiptPreview = suspendedFallback<{
	id: ReceiptId;
	peerId: PeerId;
}>(
	({ id, peerId }) => {
		const trpc = useTRPC();
		const { data: receipt } = useSuspenseQuery(
			trpc.receipts.get.queryOptions({ id }),
		);
		const { formatPlainDate } = useFormat();
		const locale = useLocale();
		const sum = round(
			receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
		);
		return (
			<Link to="/receipts/$id" params={{ id: receipt.id }} color="foreground">
				<View
					testID="peer-receipt-preview"
					className="w-full overflow-hidden first-of-type:rounded-t-2xl last-of-type:rounded-b-2xl"
				>
					<View className="flex-row items-center justify-between gap-2">
						<View className="min-w-0 truncate overflow-hidden p-2">
							<Text>{receipt.name}</Text>
							<Text className="text-default-400 text-xs">
								{formatPlainDate(receipt.issued)}
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<View className="flex-row justify-end self-center p-2 text-right">
								<Text className="font-medium">
									{formatCurrency(locale, receipt.currencyCode, sum)}
								</Text>
							</View>
							<View className="hidden flex-row items-center justify-center p-2 sm:flex">
								<PeerReceiptDebtIcon receipt={receipt} peerId={peerId} />
							</View>
						</View>
					</View>
				</View>
			</Link>
		);
	},
	<PeerReceiptPreviewSkeleton />,
);

export const PeerReceipts = suspendedFallback<{ peerId: PeerId }>(
	({ peerId }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const [limit, setLimit] = React.useState(useDefaultLimit());
		const [offset, setOffset] = React.useState(0);
		const deferredOffset = React.useDeferredValue(offset);
		const { data } = useSuspenseQuery(
			trpc.receipts.getByPeerPaged.queryOptions({
				peerId,
				cursor: deferredOffset,
				limit,
			}),
		);
		React.useEffect(() => {
			// This effect helps with invalid limit changes
			const maxOffset =
				data.count === 0 ? 0 : (Math.ceil(data.count / limit) - 1) * limit;
			if (offset > maxOffset) {
				setOffset(maxOffset);
			} else if (offset % limit !== 0) {
				setOffset(Math.floor(offset / limit) * limit);
			}
		}, [data.count, limit, offset]);
		if (data.count === 0) {
			return <Text className="text-center">{t("peer.receipts.empty")}</Text>;
		}
		return (
			<View className="flex gap-2">
				<Text variant="h3">{t("peer.receipts.header")}</Text>
				<PaginationBlockShape
					totalCount={data.count}
					limit={limit}
					offset={offset}
					onLimitChange={setLimit}
					onPageChange={(page) => setOffset((page - 1) * limit)}
				/>
				<SuspendedOverlay isPending={deferredOffset !== offset}>
					<View>
						{data.items.map((id) => (
							<PeerReceiptPreview key={id} id={id} peerId={peerId} />
						))}
					</View>
				</SuspendedOverlay>
			</View>
		);
	},
	() => {
		const { t } = useTranslation("peers");
		const limit = useDefaultLimit();
		return (
			<View className="flex gap-2">
				<Text variant="h3">{t("peer.receipts.header")}</Text>
				<PaginationBlockSkeleton limit={limit} />
				<SuspendedOverlay isPending>
					<View>
						{Array.from({ length: limit }).map((_, index) => (
							// oxlint-disable-next-line react/no-array-index-key
							<PeerReceiptPreviewSkeleton key={index} />
						))}
					</View>
				</SuspendedOverlay>
			</View>
		);
	},
);
