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
	if (receipt.debt.direction === "outcoming") {
		throw new Error("Unexpected owner control button with outcoming debt");
	}
	if (!receipt.debt.id) {
		return null;
	}

	return (
		<Button
			to={receipt.debt.hasMine ? "/debts/$id" : "/debts/intentions"}
			hash={receipt.debt.hasMine ? receipt.debt.id : undefined}
			params={{ id: receipt.debt.id }}
			as={Link<"/debts/$id" | "/debts/intentions">}
			title="Incoming debt"
			variant="bordered"
			color="primary"
			isIconOnly
		>
			<DebtIcon size={24} />
		</Button>
	);
};
