import React from "react";
import { Block } from "../../components/utils/block";
import { TRPCQueryOutput } from "../../trpc";
import { ReceiptParticipant } from "../../components/receipt-participant";
import { AddReceiptParticipantForm } from "../../components/add-receipt-participant-form";
import { ReceiptItemsGetInput } from "../../utils/queries/receipt-items";

type Props = {
	participants: TRPCQueryOutput<"receipt-items.get">["participants"];
	role?: TRPCQueryOutput<"receipts.get">["role"];
	receiptItemsInput: ReceiptItemsGetInput;
};

export const ReceiptParticipantsScreen: React.FC<Props> = ({
	participants,
	role,
	receiptItemsInput,
}) => {
	const sortedParticipants = [...participants].sort(
		(a, b) => a.added.valueOf() - b.added.valueOf()
	);
	return (
		<Block name={`Total: ${participants.length} participants`}>
			{sortedParticipants.map((receiptParticipant) => (
				<ReceiptParticipant
					key={receiptParticipant.userId}
					receiptParticipant={receiptParticipant}
					receiptItemsInput={receiptItemsInput}
					role={role}
				/>
			))}
			{!role || role !== "owner" ? null : (
				<AddReceiptParticipantForm receiptItemsInput={receiptItemsInput} />
			)}
		</Block>
	);
};
