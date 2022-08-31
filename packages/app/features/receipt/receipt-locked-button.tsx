import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { LockedIcon } from "app/components/locked-icon";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
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
	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const switchResolved = useAsyncCallback(
		async (isMount, shouldPropagate = false) => {
			await updateReceiptMutation.mutateAsync({
				id: receiptId,
				update: { type: "locked", value: !locked },
			});
			if (!isMount() || !shouldPropagate) {
				return;
			}
			propagateDebts();
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
