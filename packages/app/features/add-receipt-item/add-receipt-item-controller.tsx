import React from "react";

import { Button } from "~components";
import { AddIcon } from "~components/icons";
import type { ReceiptsId } from "~db";

import { AddReceiptItemForm } from "./add-receipt-item-form";

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	isLoading: boolean;
};

export const AddReceiptItemController: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	isLoading,
}) => {
	const [isOpen, setOpen] = React.useState(false);

	if (isOpen) {
		return (
			<AddReceiptItemForm
				receiptId={receiptId}
				receiptLocked={receiptLocked}
				isLoading={isLoading}
			/>
		);
	}
	return (
		<Button
			color="primary"
			variant="bordered"
			isDisabled={receiptLocked}
			onClick={() => setOpen(true)}
			className="w-full"
		>
			<AddIcon size={24} />
			Item
		</Button>
	);
};
