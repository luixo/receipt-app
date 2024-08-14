import type React from "react";

import type { TRPCQueryOutput } from "~app/trpc";
import { Button } from "~components/button";
import { DebtIcon } from "~components/icons";
import { Link } from "~components/link";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
};

export const ReceiptGuestControlButton: React.FC<Props> = ({ receipt }) => {
	if (!receipt.lockedTimestamp) {
		return null;
	}
	if (receipt.debt.direction === "outcoming") {
		throw new Error("Unexpected owner control button with outcoming debt");
	}
	if (!receipt.debt.id) {
		return null;
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
