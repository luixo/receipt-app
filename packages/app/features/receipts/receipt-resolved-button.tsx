import React from "react";

import { MdCalculate as CalcIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { updateMutationOptions } from "../receipt/update-mutation-options";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get-paged">["items"][number];
};

export const ReceiptResolvedButton: React.FC<Props> = ({ receipt }) => {
	const receiptsGetPagedInput = cache.receipts.getPaged.useStore();
	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(updateMutationOptions, {
			pagedInput: receiptsGetPagedInput,
			input: { id: receipt.id },
		})
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "resolved", resolved: !receipt.receiptResolved },
		});
	}, [updateReceiptMutation, receipt.id, receipt.receiptResolved]);
	return (
		<IconButton
			light
			isLoading={updateReceiptMutation.isLoading}
			color={receipt.receiptResolved ? "success" : "warning"}
			onClick={switchResolved}
		>
			<CalcIcon size={24} />
		</IconButton>
	);
};
