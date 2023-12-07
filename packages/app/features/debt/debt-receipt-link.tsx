import React from "react";

import { styled } from "@nextui-org/react";
import { Button, Link } from "@nextui-org/react-tailwind";
import { MdOutlineReceipt as RawReceiptIcon } from "react-icons/md";

import type { ReceiptsId } from "next-app/db/models";

const ReceiptIcon = styled(RawReceiptIcon, {
	size: 24,
});

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
		<ReceiptIcon />
	</Button>
);
