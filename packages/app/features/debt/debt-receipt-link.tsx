import React from "react";

import { styled } from "@nextui-org/react";
import { MdOutlineReceipt as RawReceiptIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import type { ReceiptsId } from "next-app/db/models";

const ReceiptIcon = styled(RawReceiptIcon, {
	size: 24,
});

type Props = {
	receiptId: ReceiptsId;
};

export const DebtReceiptLink: React.FC<Props> = ({ receiptId }) => (
	<IconButton
		href={`/receipts/${receiptId}`}
		bordered
		auto
		color="success"
		icon={<ReceiptIcon />}
	/>
);
