import React from "react";

import { useRouter } from "solito/router";

import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
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
	const removeReceiptMutation = trpc.receipts.remove.useMutation(
		useTrpcMutationOptions(mutations.receipts.remove.options)
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isLoading),
		[removeReceiptMutation.isLoading, setLoading]
	);
	const removeReceipt = useAsyncCallback(
		async (isMount) => {
			await removeReceiptMutation.mutateAsync({ id: receipt.id });
			if (!isMount()) {
				return;
			}
			router.replace("/receipts");
		},
		[removeReceiptMutation, receipt.id, router]
	);

	return (
		<RemoveButton
			disabled={receipt.locked}
			mutation={removeReceiptMutation}
			onRemove={removeReceipt}
			subtitle="This will remove receipt forever"
			noConfirm={receipt.sum === 0}
		>
			Remove receipt
		</RemoveButton>
	);
};
