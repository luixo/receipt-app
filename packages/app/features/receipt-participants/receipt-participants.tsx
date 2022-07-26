import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { TRPCQueryOutput } from "app/trpc";
import { rotate } from "app/utils/array";
import { Currency } from "app/utils/currency";
import { getIndexByString } from "app/utils/hash";
import { calculateReceiptItemsWithSums } from "app/utils/receipt-item";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

const SpacerWithBorder = styled(Spacer, {
	"@xsMax": {
		"&:not(:last-child)": {
			width: "100%",
			borderBottomStyle: "solid",
			borderBottomColor: "$border",
			borderBottomWidth: "$thin",
		},
	},
});

type Props = {
	data: TRPCQueryOutput<"receipt-items.get">;
	receiptId: TRPCQueryOutput<"receipts.get">["id"];
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	data,
	currency,
	receiptId,
	isLoading,
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
		<>
			<div>
				{participants.map((participant, index) => (
					<React.Fragment key={participant.userId}>
						{index === 0 ? null : <Spacer y={0.5} />}
						<ReceiptParticipant
							receiptId={receiptId}
							participant={participant}
							role={data.role}
							currency={currency}
							isLoading={isLoading}
						/>
						{index === participants.length - 1 ? null : (
							<SpacerWithBorder y={0.5} />
						)}
					</React.Fragment>
				))}
			</div>
			{data.role !== "owner" ? null : (
				<>
					<Spacer y={1} />
					<AddReceiptParticipantForm
						isLoading={isLoading}
						receiptId={receiptId}
					/>
				</>
			)}
		</>
	);
};
