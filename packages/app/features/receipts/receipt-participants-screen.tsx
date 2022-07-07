import React from "react";
import { Block } from "../../components/utils/block";
import { TRPCQueryOutput } from "../../trpc";
import { ReceiptParticipant } from "../../components/receipt-participant";
import { AddReceiptParticipantForm } from "../../components/add-receipt-participant-form";
import { ReceiptItemsGetInput } from "../../utils/queries/receipt-items";
import { calculateReceiptItemsWithSums } from "../../utils/receipt-item";
import { Currency } from "../../utils/currency";
import { getIndexByString } from "../../utils/hash";
import { rotate } from "../../utils/array";

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
