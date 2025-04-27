import React from "react";

import { RemoveButton } from "~app/components/remove-button";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { options as receiptsRemoveOptions } from "~mutations/receipts/remove";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	setLoading: (nextLoading: boolean) => void;
} & Omit<React.ComponentProps<typeof RemoveButton>, "mutation" | "onRemove">;

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
	...props
}) => {
	const navigate = useNavigate();
	const removeReceiptMutation = trpc.receipts.remove.useMutation(
		useTrpcMutationOptions(receiptsRemoveOptions, {
			onSuccess: () => navigate("/receipts", { replace: true }),
		}),
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isPending),
		[removeReceiptMutation.isPending, setLoading],
	);
	const removeReceipt = React.useCallback(
		() => removeReceiptMutation.mutate({ id: receipt.id }),
		[removeReceiptMutation, receipt.id],
	);

	return (
		<RemoveButton
			mutation={removeReceiptMutation}
			onRemove={removeReceipt}
			subtitle="This will remove receipt forever"
			noConfirm={receipt.items.length === 0}
			{...props}
		>
			Remove receipt
		</RemoveButton>
	);
};
