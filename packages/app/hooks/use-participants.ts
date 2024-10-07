import React from "react";

import { isNonNullish } from "remeda";

import { type TRPCQueryOutput, trpc } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import {
	getDecimalsPower,
	getItemCalculations,
	getParticipantSums,
} from "~app/utils/receipt-item";
import type { NonNullableField } from "~utils/types";

const getDebtIds = (receipt: TRPCQueryOutput<"receipts.get">) =>
	receipt.debt.direction === "outcoming"
		? receipt.debt.ids
		: receipt.debt.id
		? [receipt.debt.id]
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
	return a.createdAt.valueOf() - b.createdAt.valueOf();
};
const DECIMAL_POWER = getDecimalsPower();

export const useParticipants = (receipt: TRPCQueryOutput<"receipts.get">) => {
	const debtsQueries = trpc.useQueries((t) =>
		getDebtIds(receipt).map((debtId) => t.debts.get({ id: debtId })),
	);
	const isOwner = receipt.ownerUserId === receipt.selfUserId;
	const participants = React.useMemo(() => {
		const debts = debtsQueries
			.filter((debtQuery) => debtQuery.status === "success")
			.map((debt) => debt.data);
		const awaitingDebts = debts.length !== getDebtIds(receipt).length;
		const calculatedItems = receipt.items.map((item) => ({
			calculations: getItemCalculations(
				item.price * item.quantity,
				item.parts.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
			id: item.id,
			name: item.name,
		}));
		return getParticipantSums(receipt.id, receipt.items, receipt.participants)
			.sort(SORT_PARTICIPANTS)
			.map((participant) => ({
				...participant,
				items: calculatedItems
					.map((item) => {
						const sum =
							item.calculations.sumFlooredByParticipant[participant.userId];
						if (!sum) {
							return null;
						}
						return {
							sum: sum / DECIMAL_POWER,
							hasExtra: Boolean(
								item.calculations.shortageByParticipant[participant.userId],
							),
							id: item.id,
							name: item.name,
						};
					})
					.filter(isNonNullish),
				currentDebt: awaitingDebts
					? null
					: debts.find((debt) =>
							isOwner
								? debt.userId === participant.userId
								: debt.userId === receipt.ownerUserId &&
								  participant.userId === receipt.selfUserId,
					  ),
			}));
	}, [debtsQueries, isOwner, receipt]);

	// Debts that are non-zero and reasonable (foreigns for own receipt, own for foreign receipt)
	const syncableParticipants = React.useMemo(
		() =>
			participants
				.filter((participant) => {
					const isSelfParticipant = participant.userId === receipt.selfUserId;
					if (isOwner) {
						return !isSelfParticipant;
					}
					return isSelfParticipant;
				})
				.filter(({ sum }) => sum !== 0),
		[isOwner, participants, receipt.selfUserId],
	);
	// Debts not created yet
	const nonCreatedParticipants = React.useMemo(
		() => syncableParticipants.filter(({ currentDebt }) => !currentDebt),
		[syncableParticipants],
	);
	// Debts that are already created
	const createdParticipants = React.useMemo(
		() =>
			syncableParticipants.filter(
				(
					participant,
				): participant is NonNullableField<typeof participant, "currentDebt"> =>
					!nonCreatedParticipants.includes(participant),
			),
		[syncableParticipants, nonCreatedParticipants],
	);
	// Debts being de-synced from the receipt
	const desyncedParticipants = React.useMemo(
		() =>
			createdParticipants.filter(
				({ currentDebt, sum }) =>
					!isDebtInSyncWithReceipt(
						{ ...receipt, participantSum: sum },
						currentDebt,
					),
			),
		[createdParticipants, receipt],
	);
	// Debts being synced with the receipt
	const syncedParticipants = React.useMemo(
		() =>
			createdParticipants.filter(
				(participant) => !desyncedParticipants.includes(participant),
			),
		[createdParticipants, desyncedParticipants],
	);
	return {
		participants,
		syncableParticipants,
		createdParticipants,
		nonCreatedParticipants,
		desyncedParticipants,
		syncedParticipants,
	};
};

export type Participant = ReturnType<
	typeof useParticipants
>["participants"][number];
