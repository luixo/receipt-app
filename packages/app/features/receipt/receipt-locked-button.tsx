import React from "react";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	locked: boolean;
	isLoading: boolean;
};

export const ReceiptLockedButton: React.FC<Props> = ({
	receiptId,
	locked,
	isLoading,
}) => {
	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const switchResolved = React.useCallback(
		() =>
			updateReceiptMutation.mutate({
				id: receiptId,
				update: { type: "locked", value: !locked },
			}),
		[updateReceiptMutation, receiptId, locked]
	);
	return (
		<IconButton
			ghost
			isLoading={updateReceiptMutation.isLoading}
			disabled={isLoading}
			onClick={switchResolved}
			color={locked ? "success" : "warning"}
			icon={
				<LockedIcon
					locked={locked}
					tooltip={locked ? "Receipt locked" : "Receipt unlocked"}
				/>
			}
		/>
	);
};
