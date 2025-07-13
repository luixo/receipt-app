import React from "react";

import { useSuspenseQueries } from "@tanstack/react-query";
import { isNonNullish } from "remeda";

import { useDecimals } from "~app/hooks/use-decimals";
import type { TRPCQueryOutput } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import {
	getItemCalculations,
	getParticipantSums,
} from "~app/utils/receipt-item";
import { useTRPC } from "~app/utils/trpc";
import { compare } from "~utils/date";
import type { NonNullableField } from "~utils/types";

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
	const { fromSubunitToUnit } = useDecimals();
	const debts = useSuspenseQueries({
		queries: getDebtIds(receipt).map((debtId) =>
			trpc.debts.get.queryOptions({ id: debtId }),
		),
	}).map(({ data }) => data);
	const isOwner = receipt.ownerUserId === receipt.selfUserId;
	const participantsWithDebts = React.useMemo(
		() =>
			participants.map((participant) => ({
				...participant,
				currentDebt: debts.find((debt) =>
					isOwner
						? debt.userId === participant.userId
						: debt.userId === receipt.ownerUserId &&
							participant.userId === receipt.selfUserId,
				),
			})),
		[debts, isOwner, participants, receipt.ownerUserId, receipt.selfUserId],
	);

	// Debts that are non-zero and reasonable (foreigns for own receipt, own for foreign receipt)
	const syncableParticipants = React.useMemo(
		() =>
			participantsWithDebts
				.filter((participant) => {
					const isSelfParticipant = participant.userId === receipt.selfUserId;
					if (isOwner) {
						return !isSelfParticipant;
					}
					return isSelfParticipant;
				})
				.filter((participant) => {
					const sumDecimals =
						participant.debtSumDecimals - participant.paySumDecimals;
					return sumDecimals !== 0;
				}),
		[isOwner, participantsWithDebts, receipt.selfUserId],
	);
	// Debts not created yet
	const nonCreatedParticipants = React.useMemo(
		() =>
			syncableParticipants.filter(
				({ currentDebt }) => currentDebt === undefined,
			),
		[syncableParticipants],
	);
	// Debts that are already created
	const createdParticipants = React.useMemo(
		() =>
			syncableParticipants.filter(
				(
					participant,
				): participant is NonNullableField<typeof participant, "currentDebt"> =>
					Boolean(participant.currentDebt),
			),
		[syncableParticipants],
	);
	// Debts being de-synced from the receipt
	const desyncedParticipants = React.useMemo(
		() =>
			createdParticipants.filter((participant) => {
				const sum = fromSubunitToUnit(
					participant.debtSumDecimals - participant.paySumDecimals,
				);
				return !isDebtInSyncWithReceipt(
					{
						...receipt,
						participantSum:
							receipt.debts.direction === "outcoming" ? sum : -sum,
					},
					participant.currentDebt,
				);
			}),
		[createdParticipants, fromSubunitToUnit, receipt],
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
		participantsWithDebts,
		syncableParticipants,
		createdParticipants,
		nonCreatedParticipants,
		desyncedParticipants,
		syncedParticipants,
	};
};

export type Participant = ReturnType<typeof useParticipants>[number];
