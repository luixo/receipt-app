import React from "react";

import { Spacer } from "@nextui-org/react";
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
		useTrpcMutationOptions(mutations.receipts.update.options)
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
				}
			);
		},
		[updateReceiptMutation, receiptId, locked, propagateDebts]
	);
	return (
		<>
			<IconButton
				ghost
				isLoading={updateReceiptMutation.isLoading}
				disabled={isLoading}
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
						disabled={isLoading}
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
};
