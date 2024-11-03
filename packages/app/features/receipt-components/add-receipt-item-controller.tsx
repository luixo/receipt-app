import React from "react";

import { Button } from "~components/button";
import { AddIcon } from "~components/icons";

import { AddReceiptItemForm } from "./add-receipt-item-form";
import { useReceiptContext } from "./context";

export const AddReceiptItemController: React.FC = () => {
	const { receiptDisabled } = useReceiptContext();
	const [isOpen, setOpen] = React.useState(false);

	if (isOpen) {
		return <AddReceiptItemForm />;
	}
	return (
		<Button
			color="primary"
			variant="bordered"
			onClick={() => setOpen(true)}
			className="w-full"
			disabled={receiptDisabled}
		>
			<AddIcon size={24} />
			Item
		</Button>
	);
};
