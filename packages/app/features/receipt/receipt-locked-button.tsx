import React from "react";

import { Spacer, Tooltip } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	locked: boolean;
	isLoading: boolean;
	isPropagating: boolean;
	propagateDebts: () => void;
};

export const ReceiptLockedButton: React.FC<Props> = ({
	receiptId,
	locked,
	isLoading,
	isPropagating,
	propagateDebts,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const switchResolved = React.useCallback(
		(shouldPropagate = false) => {
			updateReceiptMutation.mutate(
				{
					id: receiptId,
					update: { type: "locked", value: !locked },
				},
				{
					onSuccess: () => {
						if (!shouldPropagate) {
							return;
						}
						propagateDebts();
					},
				},
			);
		},
		[updateReceiptMutation, receiptId, locked, propagateDebts],
	);
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
		<>
			<IconButton
				ghost
				isLoading={updateReceiptMutation.isLoading}
				disabled={isLoading || Boolean(emptyItemsWarning)}
				onClick={() => switchResolved()}
				color={locked ? "success" : "warning"}
				icon={
					<LockedIcon
						locked={locked}
						tooltip={locked ? "Receipt locked" : "Receipt unlocked"}
					/>
				}
			/>
			{!locked ? (
				<>
					<Spacer x={0.5} />
					<IconButton
						ghost
						isLoading={updateReceiptMutation.isLoading || isPropagating}
						disabled={isLoading || Boolean(emptyItemsWarning)}
						onClick={() => switchResolved(true)}
						color={locked ? "success" : "warning"}
						icon={
							<>
								<LockedIcon
									locked={locked}
									tooltip={locked ? "Receipt locked" : "Receipt unlocked"}
								/>
								<SendIcon size={24} />
							</>
						}
					/>
				</>
			) : null}
		</>
	);
	if (emptyItemsWarning) {
		return (
			<Tooltip content={emptyItemsWarning} placement="bottomEnd">
				{elements}
			</Tooltip>
		);
	}
	return elements;
};
