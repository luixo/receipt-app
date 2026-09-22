import React from "react";

import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";

import { useDecimals } from "~app/hooks/use-decimals";
import type { Receipt, ReceiptParticipant } from "~app/trpc-types";
import { getParticipantSums } from "~app/utils/receipt-item";
import { useTRPC } from "~app/utils/trpc";
import type { PeerId } from "~db/ids";

const getDebtIds = (receipt: Pick<Receipt, "debts">) =>
	receipt.debts.direction === "outcoming"
		? receipt.debts.debts.map(({ id }) => id)
		: receipt.debts.id
			? [receipt.debts.id]
			: [];

const SORT_PARTICIPANTS = (a: ReceiptParticipant, b: ReceiptParticipant) => {
	// Sort first by owner
	if (a.role === "owner") {
		return -1;
	}
	if (b.role === "owner") {
		return 1;
	}
	// Sort everyone else by createdAt timestamp
	return Temporal.ZonedDateTime.compare(a.createdAt, b.createdAt);
};

export const useParticipants = (receipt: Omit<Receipt, "name">) => {
	const { fromUnitToSubunit, fromSubunitToUnit } = useDecimals();
	return React.useMemo(() => {
		const participantsSums = getParticipantSums(
			receipt.id,
			receipt.ownerPeerId,
			receipt.items,
			receipt.participants,
			receipt.payers,
			fromUnitToSubunit,
			fromSubunitToUnit,
		);
		return receipt.participants
			.toSorted(SORT_PARTICIPANTS)
			.map((participant) => {
				const matchedParticipant = participantsSums.find(
					({ peerId }) => peerId === participant.peerId,
				);
				if (!matchedParticipant) {
					throw new Error(
						"Expected to have matched participant on getting their sums",
					);
				}
				return {
					...participant,
					debt: matchedParticipant.debt,
					payment: matchedParticipant.payment,
					balance: matchedParticipant.balance,
				};
			});
	}, [fromSubunitToUnit, fromUnitToSubunit, receipt]);
};

export const useParticipantsWithDebts = (receipt: Omit<Receipt, "name">) => {
	const participants = useParticipants(receipt);
	const trpc = useTRPC();
	const debtIds = getDebtIds(receipt);
	const { data: intentions } = useSuspenseQuery(
		trpc.debtIntentions.getAll.queryOptions(),
	);
	const debts = useSuspenseQueries({
		queries: debtIds
			.filter(
				(debtId) =>
					!intentions.items.some((intention) => intention.id === debtId),
			)
			.map((debtId) => trpc.debts.get.queryOptions({ id: debtId })),
	});
	const isOwner = receipt.ownerPeerId === receipt.selfPeerId;
	const getDebt = React.useCallback(
		(participantPeerId: PeerId) => {
			const ownDebt = debts.find((debt) =>
				isOwner
					? debt.data.peerId === participantPeerId
					: debt.data.peerId === receipt.ownerPeerId &&
						participantPeerId === receipt.selfPeerId,
			)?.data;
			const incomingIntention = intentions.items.find(
				(intention) =>
					intention.peerId === participantPeerId &&
					intention.receiptId === receipt.id,
			);
			if (ownDebt) {
				return {
					id: ownDebt.id,
					peerId: ownDebt.peerId,
					receiptId: ownDebt.receiptId,
					our: {
						amount: ownDebt.amount,
						currencyCode: ownDebt.currencyCode,
						timestamp: ownDebt.timestamp,
						updatedAt: ownDebt.updatedAt,
					},
					their: ownDebt.their
						? {
								amount: ownDebt.their.amount,
								currencyCode: ownDebt.their.currencyCode,
								timestamp: ownDebt.their.timestamp,
								updatedAt: ownDebt.their.updatedAt,
							}
						: undefined,
				};
			}
			if (incomingIntention) {
				return {
					id: incomingIntention.id,
					peerId: incomingIntention.peerId,
					receiptId: incomingIntention.receiptId,
					their: {
						amount: incomingIntention.amount,
						currencyCode: incomingIntention.currencyCode,
						timestamp: incomingIntention.timestamp,
						updatedAt: incomingIntention.updatedAt,
					},
				};
			}
		},
		[
			debts,
			intentions,
			isOwner,
			receipt.id,
			receipt.ownerPeerId,
			receipt.selfPeerId,
		],
	);
	const participantsWithDebts = React.useMemo(
		() =>
			participants.map((participant) => ({
				...participant,
				currentDebt: getDebt(participant.peerId),
			})),
		[getDebt, participants],
	);

	// Debts that are non-zero and non-owner
	const syncableParticipants = React.useMemo(
		() =>
			participantsWithDebts
				.filter((participant) => participant.peerId !== receipt.ownerPeerId)
				.filter((participant) => participant.balance !== 0),
		[participantsWithDebts, receipt.ownerPeerId],
	);
	return {
		participantsWithDebts,
		syncableParticipants,
	};
};

export type Participant = ReturnType<typeof useParticipants>[number];
