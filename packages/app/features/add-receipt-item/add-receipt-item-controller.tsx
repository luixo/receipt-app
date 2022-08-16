import React from "react";

import { Button } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { ReceiptsId } from "next-app/db/models";

import { AddReceiptItemForm } from "./add-receipt-item-form";

type Props = {
	receiptId: ReceiptsId;
	isLoading: boolean;
};

export const AddReceiptItemController: React.FC<Props> = ({
	receiptId,
	isLoading,
}) => {
	const [isOpen, setOpen] = React.useState(false);

	if (isOpen) {
		return (
			<AddReceiptItemForm
				receiptId={receiptId}
				isLoading={isLoading}
				onDone={() => setOpen(false)}
			/>
		);
	}
	return (
		<Button
			bordered
			icon={<AddIcon size={24} />}
			onClick={() => setOpen(true)}
			css={{ margin: "0 auto" }}
		>
			Item
		</Button>
	);
};
