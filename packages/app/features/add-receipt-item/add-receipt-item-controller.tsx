import React from "react";

import type { TRPCQueryOutput } from "~app/trpc";
import { Button } from "~components/button";
import { AddIcon } from "~components/icons";

import { AddReceiptItemForm } from "./add-receipt-item-form";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const AddReceiptItemController: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const [isOpen, setOpen] = React.useState(false);

	if (isOpen) {
		return <AddReceiptItemForm receipt={receipt} isLoading={isLoading} />;
	}
	return (
		<Button
			color="primary"
			variant="bordered"
			isDisabled={Boolean(receipt.lockedTimestamp)}
			onClick={() => setOpen(true)}
			className="w-full"
		>
			<AddIcon size={24} />
			Item
		</Button>
	);
};
