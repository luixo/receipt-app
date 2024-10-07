import type React from "react";

import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";

import { ReceiptLockedButton } from "./receipt-locked-button";
import { ReceiptSyncButton } from "./receipt-sync-button";

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
				<ReceiptSyncButton
					key={
						receipt.participants.filter(
							(participant) => participant.userId !== receipt.selfUserId,
						).length
					}
					queries={debtsQueries}
					isLoading={deleteLoading}
					receipt={receipt}
				/>
			) : null}
		</>
	);
};
