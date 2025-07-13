import type React from "react";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { Button } from "~components/button";
import { SyncIcon, UnsyncIcon } from "~components/icons";
import { Skeleton } from "~components/skeleton";

export const skeletonReceiptPreviewSyncIcon = (
	<Skeleton className="size-6 rounded" />
);

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreviewSyncIcon: React.FC<Props> = suspendedFallback(
	({ receipt }) => {
		const {
			participantsWithDebts,
			syncableParticipants,
			desyncedParticipants,
			nonCreatedParticipants,
			syncedParticipants,
		} = useParticipantsWithDebts(receipt);
		if (receipt.selfUserId === receipt.ownerUserId) {
			if (receipt.items.length === 0) {
				return null;
			}
			const hasNonDistributedItems = receipt.items.some(
				(item) => item.consumers.length === 0,
			);
			const noParticipants = participantsWithDebts.length === 0;
			const someParticipantsNotSynced =
				syncableParticipants.length !== syncedParticipants.length;
			const notSynced =
				hasNonDistributedItems || noParticipants || someParticipantsNotSynced;
			return (
				<Button
					variant="light"
					isDisabled
					isIconOnly
					color={notSynced ? "warning" : "success"}
				>
					{notSynced ? <UnsyncIcon size={24} /> : <SyncIcon size={24} />}
				</Button>
			);
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
		if (nonCreatedParticipants.includes(selfParticipant)) {
			return (
				<Button variant="light" isDisabled isIconOnly color="warning">
					<UnsyncIcon size={24} />
				</Button>
			);
		}
		if (
			desyncedParticipants.includes(
				selfParticipant as (typeof desyncedParticipants)[number],
			)
		) {
			return (
				<Button variant="light" isDisabled isIconOnly color="danger">
					<UnsyncIcon size={24} />
				</Button>
			);
		}
		return (
			<Button variant="light" isDisabled isIconOnly color="success">
				<SyncIcon size={24} />
			</Button>
		);
	},
	skeletonReceiptPreviewSyncIcon,
);
