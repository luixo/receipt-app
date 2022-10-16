import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { getParticipantSums } from "app/utils/receipt-item";
import { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";

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

type Participant = TRPCQueryOutput<"receiptItems.get">["participants"][number];

const getSortParticipants =
	(selfAccountId?: AccountsId) => (a: Participant, b: Participant) => {
		if (selfAccountId) {
			// Sort first by self
			if (a.localUserId === selfAccountId) {
				return -1;
			}
			if (b.localUserId === selfAccountId) {
				return -1;
			}
		}
		// Sort second by owner
		if (a.role === "owner") {
			return 1;
		}
		if (b.role === "owner") {
			return 1;
		}
		// Sort everyone else by name
		return a.name.localeCompare(b.name);
	};

type Props = {
	data: TRPCQueryOutput<"receiptItems.get">;
	receiptId: ReceiptsId;
	receiptSelfUserId?: UsersId;
	receiptLocked: boolean;
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	data,
	receiptLocked,
	receiptSelfUserId,
	currency,
	receiptId,
	isLoading,
}) => {
	const selfAccountId = useSelfAccountId();
	const sortParticipants = React.useMemo(
		() => getSortParticipants(selfAccountId),
		[selfAccountId]
	);
	const participants = React.useMemo(
		() =>
			getParticipantSums(receiptId, data.items, data.participants).sort(
				sortParticipants
			),
		[data, receiptId, sortParticipants]
	);
	return (
		<>
			{participants.map((participant, index) => (
				<React.Fragment key={participant.remoteUserId}>
					{index === 0 ? null : <Spacer y={0.5} />}
					<ReceiptParticipant
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptSelfUserId={receiptSelfUserId}
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
