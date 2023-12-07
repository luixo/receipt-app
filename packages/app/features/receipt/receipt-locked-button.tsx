import React from "react";

import { Button, Tooltip } from "@nextui-org/react";

import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

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
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receiptId,
			update: { type: "locked", locked: !locked },
		});
	}, [updateReceiptMutation, receiptId, locked]);
	const receiptItemsQuery = trpc.receiptItems.get.useQuery({ receiptId });
	const emptyItemsWarning = React.useMemo(() => {
		if (!receiptItemsQuery.data) {
			return `Please wait until we verify receipt has no empty items..`;
		}
		const emptyItems = receiptItemsQuery.data.items.filter(
			(item) => item.parts.length === 0,
		);
		if (emptyItems.length === 0) {
			return;
		}
		return `There are ${emptyItems.length} empty items, cannot lock`;
	}, [receiptItemsQuery.data]);
	const elements = (
		<Tooltip content={locked ? "Receipt locked" : "Receipt unlocked"}>
			<Button
				variant="ghost"
				isLoading={updateReceiptMutation.isLoading}
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
