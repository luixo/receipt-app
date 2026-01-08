import type React from "react";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
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
					<Icon name="sync" className="size-6" />
				</Button>
			);
		case "unsynced":
			return (
				<Button variant="light" isDisabled isIconOnly color="warning">
					<Icon name="unsync" className="size-6" />
				</Button>
			);
		case "desynced":
			return (
				<Button variant="light" isDisabled isIconOnly color="danger">
					<Icon name="unsync" className="size-6" />
				</Button>
			);
	}
};

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreviewSyncIcon: React.FC<Props> = suspendedFallback(
	({ receipt }) => {
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
			const syncedParticipants = syncableParticipants.filter((participant) =>
				participant.currentDebt?.our
					? isDebtInSyncWithReceipt(
							{ ...receipt, participantSum: participant.balance },
							participant.currentDebt.our,
						)
					: false,
			);
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

		if (
			!isDebtInSyncWithReceipt(
				{ ...receipt, participantSum: -selfParticipant.balance },
				selfParticipant.currentDebt.our,
			)
		) {
			return <StatusButton type="desynced" />;
		}
		return <StatusButton type="synced" />;
	},
	skeletonReceiptPreviewSyncIcon,
);
