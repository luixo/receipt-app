import React from "react";

import { RemoveButton } from "app/components/remove-button";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	setLoading: (nextLoading: boolean) => void;
};

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
}) => {
	const router = useRouter();
	const removeReceiptMutation = trpc.receipts.remove.useMutation(
		useTrpcMutationOptions(mutations.receipts.remove.options, {
			context: {
				participantResolved: receipt.participantResolved,
			},
			onSuccess: () => router.replace("/receipts"),
		}),
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isLoading),
		[removeReceiptMutation.isLoading, setLoading],
	);
	const removeReceipt = React.useCallback(
		() => removeReceiptMutation.mutate({ id: receipt.id }),
		[removeReceiptMutation, receipt.id],
	);

	return (
		<RemoveButton
			isDisabled={Boolean(receipt.lockedTimestamp)}
			mutation={removeReceiptMutation}
			onRemove={removeReceipt}
			subtitle="This will remove receipt forever"
			noConfirm={receipt.sum === 0}
		>
			Remove receipt
		</RemoveButton>
	);
};
