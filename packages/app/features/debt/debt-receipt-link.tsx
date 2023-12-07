import React from "react";

import { Button, Link } from "@nextui-org/react-tailwind";
import { MdOutlineReceipt as ReceiptIcon } from "react-icons/md";

import type { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
};

export const DebtReceiptLink: React.FC<Props> = ({ receiptId }) => (
	<Button
		as={Link}
		href={`/receipts/${receiptId}`}
		variant="bordered"
		color="success"
		isIconOnly
	>
		<ReceiptIcon size={24} />
	</Button>
);
