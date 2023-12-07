import React from "react";

import { Button } from "@nextui-org/react-tailwind";
import {
	MdLock as LockedIcon,
	MdLockOpen as UnlockedIcon,
} from "react-icons/md";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

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
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
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
			isLoading={updateMutation.isLoading || props.isLoading}
			onClick={switchLocked}
			isIconOnly
		>
			{locked ? <LockedIcon size={24} /> : <UnlockedIcon size={24} />}
		</Button>
	);
};
