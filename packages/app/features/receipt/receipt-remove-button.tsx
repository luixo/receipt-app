import React from "react";

import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	setLoading: (nextLoading: boolean) => void;
};

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
}) => {
	const router = useRouter();
	const deleteReceiptMutation = trpc.useMutation(
		"receipts.delete",
		useTrpcMutationOptions(cache.receipts.delete.mutationOptions)
	);
	React.useEffect(
		() => setLoading(deleteReceiptMutation.isLoading),
		[deleteReceiptMutation.isLoading, setLoading]
	);
	const deleteReceipt = useAsyncCallback(
		async (isMount) => {
			await deleteReceiptMutation.mutateAsync({ id: receipt.id });
			if (!isMount()) {
				return;
			}
			router.replace("/receipts");
		},
		[deleteReceiptMutation, receipt.id]
	);

	return (
		<RemoveButton
			mutation={deleteReceiptMutation}
			onRemove={deleteReceipt}
			subtitle="This will remove receipt forever"
			noConfirm={receipt.sum === 0}
		>
			Remove receipt
		</RemoveButton>
	);
};
