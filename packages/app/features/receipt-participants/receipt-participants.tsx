import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { getParticipantSums } from "app/utils/receipt-item";
import { ReceiptsId } from "next-app/db/models";

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
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	data,
	receiptLocked,
	currency,
	receiptId,
	isLoading,
}) => {
	const participants = React.useMemo(
		() => getParticipantSums(receiptId, data.items, data.participants),
		[data, receiptId]
	);
	return (
		<>
			{participants.map((participant, index) => (
				<React.Fragment key={participant.remoteUserId}>
					{index === 0 ? null : <Spacer y={0.5} />}
					<ReceiptParticipant
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						participant={participant}
						role={data.role}
						currency={currency}
						isLoading={isLoading}
					/>
					<SpacerWithBorder y={0.5} />
					{index === participants.length - 1 ? <Spacer y={1} /> : null}
				</React.Fragment>
			))}
			{data.role !== "owner" ? null : (
				<AddReceiptParticipantForm
					disabled={isLoading}
					receiptId={receiptId}
					receiptLocked={receiptLocked}
					filterIds={participants.map(
						(participant) => participant.remoteUserId
					)}
				/>
			)}
		</>
	);
};
