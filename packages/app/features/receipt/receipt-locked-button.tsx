import React from "react";

import { LockedIcon } from "~app/components/locked-icon";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Tooltip } from "~components/tooltip";
import type { ReceiptsId } from "~db/models";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receiptId: ReceiptsId;
	emptyItemsAmount: number;
	locked: boolean;
	isLoading: boolean;
};

export const ReceiptLockedButton: React.FC<Props> = ({
	receiptId,
	emptyItemsAmount,
	locked,
	isLoading,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receiptId,
			update: { type: "locked", locked: !locked },
		});
	}, [updateReceiptMutation, receiptId, locked]);
	const emptyItemsWarning = React.useMemo(() => {
		if (emptyItemsAmount === 0) {
			return;
		}
		return `There are ${emptyItemsAmount} empty items, cannot lock`;
	}, [emptyItemsAmount]);
	const elements = (
		<Tooltip content={locked ? "Receipt locked" : "Receipt unlocked"}>
			<Button
				variant="ghost"
				isLoading={updateReceiptMutation.isPending}
				isDisabled={isLoading || Boolean(emptyItemsWarning)}
				onClick={() => switchResolved()}
				color={locked ? "success" : "warning"}
				isIconOnly
			>
				<LockedIcon locked={locked} />
			</Button>
		</Tooltip>
	);
	if (emptyItemsWarning) {
		return (
			<Tooltip content={emptyItemsWarning} placement="bottom-end">
				{elements}
			</Tooltip>
		);
	}
	return elements;
};
