import React from "react";

import { Collapse } from "@nextui-org/react";

import { useSelfAccountId } from "app/hooks/use-self-account-id";
import type { TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import {
	getDecimalsPower,
	getItemCalculations,
	getParticipantSums,
} from "app/utils/receipt-item";
import { nonNullishGuard } from "app/utils/utils";
import type { AccountsId, ReceiptsId, UsersId } from "next-app/db/models";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

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
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	data,
	receiptLocked,
	receiptSelfUserId,
	currencyCode,
	receiptId,
	isLoading,
}) => {
	const selfAccountId = useSelfAccountId();
	const sortParticipants = React.useMemo(
		() => getSortParticipants(selfAccountId),
		[selfAccountId],
	);
	const participants = React.useMemo(() => {
		const decimalsPower = getDecimalsPower();
		const items = data.items.map((item) => ({
			calculations: getItemCalculations<UsersId>(
				item.price * item.quantity,
				item.parts.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
			id: item.id,
			name: item.name,
		}));
		return getParticipantSums(receiptId, data.items, data.participants)
			.sort(sortParticipants)
			.map((participant) => ({
				...participant,
				items: items
					.map((item) => {
						const sum =
							item.calculations.sumFlooredByParticipant[
								participant.remoteUserId
							];
						if (!sum) {
							return null;
						}
						return {
							sum: sum / decimalsPower,
							hasExtra: Boolean(
								item.calculations.shortageByParticipant[
									participant.remoteUserId
								],
							),
							id: item.id,
							name: item.name,
						};
					})
					.filter(nonNullishGuard),
			}));
	}, [data, receiptId, sortParticipants]);
	return (
		<Collapse
			key={participants.map(({ remoteUserId }) => remoteUserId).join(";")}
			title="🥸 Participants"
			shadow
			expanded={data.role === "owner"}
		>
			<Collapse.Group>
				{participants.map((participant) => (
					<ReceiptParticipant
						key={participant.remoteUserId}
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptSelfUserId={receiptSelfUserId}
						participant={participant}
						role={data.role}
						currencyCode={currencyCode}
						isLoading={isLoading}
					/>
				))}
			</Collapse.Group>
			{data.role !== "owner" ? null : (
				<AddReceiptParticipantForm
					disabled={isLoading}
					receiptId={receiptId}
					receiptLocked={receiptLocked}
					filterIds={participants.map(
						(participant) => participant.remoteUserId,
					)}
				/>
			)}
		</Collapse>
	);
};
