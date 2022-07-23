import React from "react";

import { MdDoneAll as DoneIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { updateMutationOptions } from "app/features/receipt-participants/update-mutation-options";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get-paged">["items"][number];
};

export const ReceiptParticipantResolvedButton: React.FC<Props> = ({
	receipt,
}) => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const updateReceiptMutation = trpc.useMutation(
		"receipt-participants.update",
		useTrpcMutationOptions(updateMutationOptions, {
			receiptItemsInput: { receiptId: receipt.id },
			receiptsPagedInput: cache.receipts.getPaged.useStore(),
			isSelfAccount: true,
		})
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId: receipt.id,
			userId: receipt.userId,
			update: { type: "resolved", resolved: !receipt.participantResolved },
		});
	}, [
		updateReceiptMutation,
		receipt.id,
		receipt.userId,
		receipt.participantResolved,
	]);
	return (
		<IconButton
			light
			isLoading={updateReceiptMutation.isLoading}
			disabled={
				receipt.participantResolved === null ||
				accountQuery.status !== "success"
			}
			color={receipt.participantResolved ? "success" : "warning"}
			onClick={switchResolved}
		>
			<DoneIcon size={24} />
		</IconButton>
	);
};
