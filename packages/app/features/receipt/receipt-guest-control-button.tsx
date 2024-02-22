import React from "react";

import { Button, Link } from "@nextui-org/react";
import { PiMoney as DebtIcon } from "react-icons/pi";

import type { TRPCQueryOutput } from "app/trpc";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
};

export const ReceiptGuestControlButton: React.FC<Props> = ({ receipt }) => {
	if (!receipt.debt || !receipt.lockedTimestamp) {
		return null;
	}
	if (receipt.debt.direction === "outcoming") {
		throw new Error("Unexpected owner control button with outcoming debt");
	}

	return (
		<Button
			href={
				receipt.debt.hasMine
					? `/debts/${receipt.debt.id}`
					: `/debts/intentions#${receipt.debt.id}`
			}
			as={Link}
			title="Incoming debt"
			variant="bordered"
			color="primary"
			isIconOnly
		>
			<DebtIcon size={24} />
		</Button>
	);
};
