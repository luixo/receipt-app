import React from "react";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { LockedIcon, UnlockedIcon } from "~components/icons";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	locked: boolean;
} & Omit<
	React.ComponentProps<typeof Button>,
	"onClick" | "color" | "variant" | "isIconOnly"
>;

export const ReceiptItemLockedButton: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	locked,
	...props
}) => {
	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
		}),
	);
	const switchLocked = React.useCallback(() => {
		updateMutation.mutate({
			id: receiptItemId,
			update: { type: "locked", locked: !locked },
		});
	}, [updateMutation, receiptItemId, locked]);

	return (
		<Button
			{...props}
			color={locked ? "success" : "warning"}
			variant="ghost"
			isLoading={updateMutation.isPending || props.isLoading}
			onClick={switchLocked}
			isIconOnly
		>
			{locked ? <LockedIcon size={24} /> : <UnlockedIcon size={24} />}
		</Button>
	);
};
