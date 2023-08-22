import React from "react";

import { PiMoney as DebtIcon } from "react-icons/pi";

import { IconButton } from "app/components/icon-button";
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
		<IconButton
			href={
				receipt.debt.type === "mine"
					? `/debts/${receipt.debt.id}`
					: `/debts/intentions#${receipt.debt.id}`
			}
			title="Incoming debt"
			bordered
			icon={<DebtIcon size={24} />}
		/>
	);
};
