import React from "react";

import { LockedIcon } from "~app/components/locked-icon";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Tooltip } from "~components/tooltip";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptLockedButton: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "locked", locked: !receipt.lockedTimestamp },
		});
	}, [updateReceiptMutation, receipt.id, receipt.lockedTimestamp]);

	const emptyItemsAmount = receipt.items.filter(
		(item) => item.parts.length === 0,
	).length;
	const emptyItemsWarning = React.useMemo(() => {
		if (emptyItemsAmount === 0) {
			return;
		}
		return `There are ${emptyItemsAmount} empty items, cannot lock`;
	}, [emptyItemsAmount]);
	const elements = (
		<Tooltip
			content={receipt.lockedTimestamp ? "Receipt locked" : "Receipt unlocked"}
		>
			<Button
				variant="ghost"
				isLoading={updateReceiptMutation.isPending}
				isDisabled={isLoading || Boolean(emptyItemsWarning)}
				onClick={() => switchResolved()}
				color={receipt.lockedTimestamp ? "success" : "warning"}
				isIconOnly
			>
				<LockedIcon locked={Boolean(receipt.lockedTimestamp)} />
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
