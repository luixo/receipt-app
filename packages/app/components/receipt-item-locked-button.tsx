import React from "react";

import {
	MdLockOpen as UnlockedIcon,
	MdLock as LockedIcon,
} from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	receiptItemId: ReceiptItemsId;
	locked: boolean;
} & Omit<React.ComponentProps<typeof IconButton>, "onClick" | "color">;

export const ReceiptItemLockedButton: React.FC<Props> = ({
	receiptId,
	receiptItemId,
	locked,
	css,
	...props
}) => {
	const updateMutation = trpc.useMutation(
		"receipt-items.update",
		useTrpcMutationOptions(cache.receiptItems.update.mutationOptions, receiptId)
	);
	const switchLocked = React.useCallback(() => {
		updateMutation.mutate({
			id: receiptItemId,
			update: { type: "locked", locked: !locked },
		});
	}, [updateMutation, receiptItemId, locked]);

	return (
		<IconButton
			{...props}
			isLoading={updateMutation.isLoading || props.isLoading}
			color={locked ? "success" : "warning"}
			onClick={switchLocked}
		>
			{locked ? <LockedIcon size={24} /> : <UnlockedIcon size={24} />}
		</IconButton>
	);
};
