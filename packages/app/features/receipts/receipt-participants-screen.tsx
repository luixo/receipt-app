import React from "react";
import { Block } from "../../components/utils/block";
import { TRPCQueryOutput } from "../../trpc";
import { ReceiptParticipant } from "../../components/receipt-participant";

type Props = {
	participants: TRPCQueryOutput<"receipt-items.get">["participants"];
};

export const ReceiptParticipantsScreen: React.FC<Props> = ({
	participants,
}) => {
	return (
		<Block name={`Total: ${participants.length} participants`}>
			{participants.map((receiptParticipant) => (
				<ReceiptParticipant
					key={receiptParticipant.userId}
					receiptParticipant={receiptParticipant}
				/>
			))}
		</Block>
	);
};
