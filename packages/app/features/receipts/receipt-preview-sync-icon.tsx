import type React from "react";

import { useParticipants } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { Button } from "~components/button";
import { SyncIcon, UnsyncIcon } from "~components/icons";
import { Spinner } from "~components/spinner";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreviewSyncIcon: React.FC<Props> = ({ receipt }) => {
	const {
		participants,
		syncableParticipants,
		desyncedParticipants,
		loadingParticipants,
		nonCreatedParticipants,
		syncedParticipants,
	} = useParticipants(receipt);
	if (receipt.selfUserId === receipt.ownerUserId) {
		if (receipt.items.length === 0) {
			return null;
		}
		const hasNonDistributedItems = receipt.items.some(
			(item) => item.parts.length === 0,
		);
		const noParticipants = participants.length === 0;
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
				{loadingParticipants.length !== 0 ? (
					<Spinner size="sm" />
				) : notSynced ? (
					<UnsyncIcon size={24} />
				) : (
					<SyncIcon size={24} />
				)}
			</Button>
		);
	}
	const selfParticipant = participants.find(
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
	if (loadingParticipants.includes(selfParticipant)) {
		return (
			<Button variant="light" isDisabled isIconOnly>
				<Spinner size="sm" />
			</Button>
		);
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
};
