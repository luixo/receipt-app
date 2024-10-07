import type React from "react";

import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";

import { ReceiptLockedButton } from "./receipt-locked-button";
import type { LockedReceipt } from "./receipt-participant-debt";
import { ReceiptPropagateButton } from "./receipt-propagate-button";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
	deleteLoading: boolean;
};

export const ReceiptOwnerControlButton: React.FC<Props> = ({
	receipt,
	deleteLoading,
}) => {
	const debtIds =
		receipt.debt.direction === "outcoming" ? receipt.debt.ids : [];
	const debtsQueries = trpc.useQueries((t) =>
		debtIds.map((id) => t.debts.get({ id })),
	);

	return (
		<>
			<ReceiptLockedButton receipt={receipt} isLoading={deleteLoading} />
			{receipt.lockedTimestamp ? (
				<ReceiptPropagateButton
					key={
						receipt.participants.filter(
							(participant) => participant.userId !== receipt.selfUserId,
						).length
					}
					queries={debtsQueries}
					receipt={receipt as LockedReceipt}
				/>
			) : null}
		</>
	);
};
