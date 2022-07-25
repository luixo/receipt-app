import React from "react";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";
import { rotate } from "app/utils/array";
import { Currency } from "app/utils/currency";
import { getIndexByString } from "app/utils/hash";
import { calculateReceiptItemsWithSums } from "app/utils/receipt-item";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

type Props = {
	data: TRPCQueryOutput<"receipt-items.get">;
	receiptId: TRPCQueryOutput<"receipts.get">["id"];
	currency?: Currency;
};

export const ReceiptParticipantsScreen: React.FC<Props> = ({
	data,
	currency,
	receiptId,
}) => {
	const participants = React.useMemo(() => {
		const sortedParticipants = [...data.participants].sort(
			(a, b) => a.added.valueOf() - b.added.valueOf()
		);
		const receiptItemsWithSums = calculateReceiptItemsWithSums(
			data.items,
			rotate(
				sortedParticipants.map((participant) => participant.userId),
				getIndexByString(receiptId)
			)
		);
		return sortedParticipants.map((participant) => ({
			...participant,
			sum: data.items.reduce(
				(acc, item) =>
					acc +
					(receiptItemsWithSums
						.find((itemWithSum) => itemWithSum.id === item.id)!
						.partsSums.find((partSum) => partSum.userId === participant.userId)
						?.sum ?? 0),
				0
			),
		}));
	}, [data, receiptId]);
	return (
		<Block name={`Total: ${data.participants.length} participants`}>
			{participants.map((receiptParticipant) => (
				<ReceiptParticipant
					key={receiptParticipant.userId}
					receiptId={receiptId}
					receiptParticipant={receiptParticipant}
					role={data.role}
					currency={currency}
				/>
			))}
			{data.role !== "owner" ? null : (
				<AddReceiptParticipantForm receiptId={receiptId} />
			)}
		</Block>
	);
};
