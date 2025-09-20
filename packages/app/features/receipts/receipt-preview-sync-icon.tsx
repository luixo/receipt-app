import type React from "react";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useDecimals } from "~app/hooks/use-decimals";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import { Button } from "~components/button";
import { SyncIcon, UnsyncIcon } from "~components/icons";
import { Skeleton } from "~components/skeleton";

export const skeletonReceiptPreviewSyncIcon = (
	<Skeleton className="size-6 rounded" />
);

const StatusButton: React.FC<{ type: "synced" | "desynced" | "unsynced" }> = ({
	type,
}) => {
	switch (type) {
		case "synced":
			return (
				<Button variant="light" isDisabled isIconOnly color="success">
					<SyncIcon size={24} />
				</Button>
			);
		case "unsynced":
			return (
				<Button variant="light" isDisabled isIconOnly color="warning">
					<UnsyncIcon size={24} />
				</Button>
			);
		case "desynced":
			return (
				<Button variant="light" isDisabled isIconOnly color="danger">
					<UnsyncIcon size={24} />
				</Button>
			);
	}
};

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreviewSyncIcon: React.FC<Props> = suspendedFallback(
	({ receipt }) => {
		const { fromSubunitToUnit } = useDecimals();
		const { participantsWithDebts, syncableParticipants } =
			useParticipantsWithDebts(receipt);
		if (receipt.items.length === 0 || participantsWithDebts.length === 0) {
			return null;
		}
		const hasNonDistributedItems = receipt.items.some(
			(item) => item.consumers.length === 0,
		);
		if (hasNonDistributedItems) {
			return <StatusButton type="unsynced" />;
		}
		if (receipt.selfUserId === receipt.ownerUserId) {
			const syncedParticipants = syncableParticipants.filter((participant) => {
				const sum = fromSubunitToUnit(
					participant.debtSumDecimals - participant.paySumDecimals,
				);
				return participant.currentDebt?.our
					? isDebtInSyncWithReceipt(
							{ ...receipt, participantSum: sum },
							participant.currentDebt.our,
						)
					: false;
			});
			if (syncableParticipants.length === syncedParticipants.length) {
				return <StatusButton type="synced" />;
			}
			return <StatusButton type="unsynced" />;
		}
		const selfParticipant = participantsWithDebts.find(
			(participant) => participant.userId === receipt.selfUserId,
		);
		if (!selfParticipant) {
			throw new Error(
				`Expected to have yourself as self participant with foreign receipt.`,
			);
		}
		if (!syncableParticipants.includes(selfParticipant)) {
			return null;
		}
		if (!selfParticipant.currentDebt?.our) {
			return <StatusButton type="unsynced" />;
		}

		const sum = fromSubunitToUnit(
			selfParticipant.debtSumDecimals - selfParticipant.paySumDecimals,
		);
		if (
			!isDebtInSyncWithReceipt(
				{ ...receipt, participantSum: -sum },
				selfParticipant.currentDebt.our,
			)
		) {
			return <StatusButton type="desynced" />;
		}
		return <StatusButton type="synced" />;
	},
	skeletonReceiptPreviewSyncIcon,
);
