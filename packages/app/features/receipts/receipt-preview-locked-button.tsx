import React from "react";

import { LockedIcon } from "~app/components/locked-icon";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreviewLockedButton: React.FC<Props> = ({ receipt }) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
	);
	const receiptLocked = Boolean(receipt.lockedTimestamp);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "locked", locked: !receiptLocked },
		});
	}, [updateReceiptMutation, receipt.id, receiptLocked]);
	return (
		<Button
			className="flex-1 flex-row self-center p-2"
			variant="light"
			isLoading={updateReceiptMutation.isPending}
			isDisabled={receipt.selfUserId !== receipt.ownerUserId}
			color={receiptLocked ? "success" : "warning"}
			isIconOnly
			onClick={switchResolved}
		>
			<LockedIcon locked={receiptLocked} />
		</Button>
	);
};
