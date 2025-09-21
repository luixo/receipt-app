import React from "react";

import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { isNonNullish } from "remeda";

import { useDecimals } from "~app/hooks/use-decimals";
import type { TRPCQueryOutput } from "~app/trpc";
import {
	getItemCalculations,
	getParticipantSums,
} from "~app/utils/receipt-item";
import { useTRPC } from "~app/utils/trpc";
import type { UsersId } from "~db/models";
import { compare } from "~utils/date";

const getDebtIds = (receipt: Pick<TRPCQueryOutput<"receipts.get">, "debts">) =>
	receipt.debts.direction === "outcoming"
		? receipt.debts.debts.map(({ id }) => id)
		: receipt.debts.id
			? [receipt.debts.id]
			: [];

type OriginalParticipant =
	TRPCQueryOutput<"receipts.get">["participants"][number];

const SORT_PARTICIPANTS = (a: OriginalParticipant, b: OriginalParticipant) => {
	// Sort first by owner
	if (a.role === "owner") {
		return -1;
	}
	if (b.role === "owner") {
		return 1;
	}
	// Sort everyone else by createdAt timestamp
	return compare.zonedDateTime(a.createdAt, b.createdAt);
};

export const useParticipants = (
	receipt: Omit<TRPCQueryOutput<"receipts.get">, "name">,
) => {
	const { fromUnitToSubunit, fromSubunitToUnit } = useDecimals();
	return React.useMemo(() => {
		const calculatedItems = receipt.items.map((item) => ({
			calculations: getItemCalculations(
				fromUnitToSubunit(item.price * item.quantity),
				item.consumers.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
			id: item.id,
			name: item.name,
		}));
		return getParticipantSums(
			receipt.id,
			receipt.items,
			receipt.participants,
			receipt.payers,
			fromUnitToSubunit,
		)
			.sort(SORT_PARTICIPANTS)
			.map((participant) => ({
				...participant,
				debtId:
					receipt.debts.direction === "outcoming"
						? receipt.debts.debts.find(
								({ userId }) => participant.userId === userId,
							)?.id
						: undefined,
				items: calculatedItems
					.map((item) => {
						const itemSum =
							item.calculations.sumFlooredByParticipant[participant.userId];
						if (!itemSum) {
							return null;
						}
						return {
							sum: fromSubunitToUnit(itemSum),
							hasExtra: Boolean(
								item.calculations.shortageByParticipant[participant.userId],
							),
							id: item.id,
							name: item.name,
						};
					})
					.filter(isNonNullish),
			}));
	}, [fromSubunitToUnit, fromUnitToSubunit, receipt]);
};

export const useParticipantsWithDebts = (
	receipt: Omit<TRPCQueryOutput<"receipts.get">, "name">,
) => {
	const participants = useParticipants(receipt);
	const trpc = useTRPC();
	const debtIds = getDebtIds(receipt);
	const { data: intentions } = useSuspenseQuery(
		trpc.debtIntentions.getAll.queryOptions(),
	);
	const debts = useSuspenseQueries({
		queries: debtIds
			.filter(
				(debtId) => !intentions.some((intention) => intention.id === debtId),
			)
			.map((debtId) => trpc.debts.get.queryOptions({ id: debtId })),
	});
	const isOwner = receipt.ownerUserId === receipt.selfUserId;
	const getDebt = React.useCallback(
		(participantUserId: UsersId) => {
			const ownDebt = debts.find((debt) =>
				isOwner
					? debt.data.userId === participantUserId
					: debt.data.userId === receipt.ownerUserId &&
						participantUserId === receipt.selfUserId,
			)?.data;
			const incomingIntention = intentions.find(
				(intention) =>
					intention.userId === participantUserId &&
					intention.receiptId === receipt.id,
			);
			if (ownDebt) {
				return {
					id: ownDebt.id,
					userId: ownDebt.userId,
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
					userId: incomingIntention.userId,
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
			receipt.ownerUserId,
			receipt.selfUserId,
		],
	);
	const participantsWithDebts = React.useMemo(
		() =>
			participants.map((participant) => ({
				...participant,
				currentDebt: getDebt(participant.userId),
			})),
		[getDebt, participants],
	);

	// Debts that are non-zero and non-owner
	const syncableParticipants = React.useMemo(
		() =>
			participantsWithDebts
				.filter((participant) => participant.userId !== receipt.ownerUserId)
				.filter((participant) => {
					const sumDecimals =
						participant.debtSumDecimals - participant.paySumDecimals;
					return sumDecimals !== 0;
				}),
		[participantsWithDebts, receipt.ownerUserId],
	);
	return {
		participantsWithDebts,
		syncableParticipants,
	};
};

export type Participant = ReturnType<typeof useParticipants>[number];
