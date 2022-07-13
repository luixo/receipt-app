import React from "react";

import { AddReceiptParticipantForm } from "app/components/add-receipt-participant-form";
import { ReceiptParticipant } from "app/components/receipt-participant";
import { Block } from "app/components/utils/block";
import { TRPCQueryOutput } from "app/trpc";
import { rotate } from "app/utils/array";
import { Currency } from "app/utils/currency";
import { getIndexByString } from "app/utils/hash";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import { calculateReceiptItemsWithSums } from "app/utils/receipt-item";

type Props = {
	data: TRPCQueryOutput<"receipt-items.get">;
	role?: TRPCQueryOutput<"receipts.get">["role"];
	receiptId: TRPCQueryOutput<"receipts.get">["id"];
	receiptItemsInput: ReceiptItemsGetInput;
	currency?: Currency;
};

export const ReceiptParticipantsScreen: React.FC<Props> = ({
	data,
	role,
	receiptItemsInput,
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
					receiptParticipant={receiptParticipant}
					receiptItemsInput={receiptItemsInput}
					role={role}
					currency={currency}
				/>
			))}
			{!role || role !== "owner" ? null : (
				<AddReceiptParticipantForm receiptItemsInput={receiptItemsInput} />
			)}
		</Block>
	);
};
