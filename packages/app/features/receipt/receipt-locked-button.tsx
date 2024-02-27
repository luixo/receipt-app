import React from "react";

import { Button, Tooltip } from "@nextui-org/react";

import { LockedIcon } from "~app/components/locked-icon";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import { trpc } from "~app/trpc";
import type { ReceiptsId } from "~web/db/models";

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
		useTrpcMutationOptions(mutations.receipts.update.options),
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
