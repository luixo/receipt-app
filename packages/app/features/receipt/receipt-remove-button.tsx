import React from "react";

import { useRouter } from "solito/navigation";

import { RemoveButton } from "~app/components/remove-button";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { ReceiptsId, UsersId } from "~db/models";
import * as mutations from "~mutations";

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	selfUserId: UsersId;
	isEmpty: boolean;
	participants: TRPCQueryOutput<"receipts.get">["participants"];
	setLoading: (nextLoading: boolean) => void;
} & Omit<React.ComponentProps<typeof RemoveButton>, "mutation" | "onRemove">;

export const ReceiptRemoveButton: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	selfUserId,
	isEmpty,
	participants,
	setLoading,
	...props
}) => {
	const router = useRouter();
	const selfResolved = participants.find(
		(participant) => participant.userId === selfUserId,
	)?.resolved;
	const removeReceiptMutation = trpc.receipts.remove.useMutation(
		useTrpcMutationOptions(mutations.receipts.remove.options, {
			context: { selfResolved },
			onSuccess: () => router.replace("/receipts"),
		}),
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isPending),
		[removeReceiptMutation.isPending, setLoading],
	);
	const removeReceipt = React.useCallback(
		() => removeReceiptMutation.mutate({ id: receiptId }),
		[removeReceiptMutation, receiptId],
	);

	return (
		<RemoveButton
			isDisabled={receiptLocked}
			mutation={removeReceiptMutation}
			onRemove={removeReceipt}
			subtitle="This will remove receipt forever"
			noConfirm={isEmpty}
			{...props}
		>
			Remove receipt
		</RemoveButton>
	);
};
