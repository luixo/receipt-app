import React from "react";

import { MdCalculate as CalcIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	resolved: boolean;
} & Omit<React.ComponentProps<typeof IconButton>, "onClick" | "color">;

export const ReceiptAccountedButton: React.FC<Props> = ({
	receiptId,
	resolved,
	...props
}) => {
	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receiptId,
			update: { type: "resolved", resolved: !resolved },
		});
	}, [updateReceiptMutation, receiptId, resolved]);
	return (
		<IconButton
			{...props}
			isLoading={updateReceiptMutation.isLoading || props.isLoading}
			color={resolved ? "success" : "warning"}
			onClick={switchResolved}
		>
			<CalcIcon size={24} />
		</IconButton>
	);
};
