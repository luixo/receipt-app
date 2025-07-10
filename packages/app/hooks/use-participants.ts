import React from "react";

import { useQueries } from "@tanstack/react-query";
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

const getDebtIds = (receipt: Pick<TRPCQueryOutput<"receipts.get">, "debt">) =>
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
	return compare(a.createdAt, b.createdAt);
};

export const useParticipants = (
	receipt: Omit<TRPCQueryOutput<"receipts.get">, "name">,
) => {
	const trpc = useTRPC();
	const { fromUnitToSubunit, fromSubunitToUnit } = useDecimals();
	const debtsQueries = useQueries({
		queries: getDebtIds(receipt).map((debtId) =>
			trpc.debts.get.queryOptions({ id: debtId }),
		),
	});
	const isOwner = receipt.ownerUserId === receipt.selfUserId;
	const participants = React.useMemo(() => {
		const debts = debtsQueries
			.filter(
				(debtQuery) =>
					debtQuery.status === "success" || debtQuery.status === "error",
			)
			// Data is empty in case of debt not found (incoming debt, not yet accepted)
			.map((debt) => debt.data);
		const awaitingDebts = debts.length !== getDebtIds(receipt).length;
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
				currentDebt: awaitingDebts
					? null
					: debts.find((debt) =>
							debt
								? isOwner
									? debt.userId === participant.userId
									: debt.userId === receipt.ownerUserId &&
										participant.userId === receipt.selfUserId
								: false,
						),
			}));
	}, [debtsQueries, fromSubunitToUnit, fromUnitToSubunit, isOwner, receipt]);

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
				.filter((participant) => {
					const sumDecimals =
						participant.debtSumDecimals - participant.paySumDecimals;
					return sumDecimals !== 0;
				}),
		[isOwner, participants, receipt.selfUserId],
	);
	// Debts not created yet
	const loadingParticipants = React.useMemo(
		() =>
			syncableParticipants.filter(({ currentDebt }) => currentDebt === null),
		[syncableParticipants],
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
						participantSum: receipt.debt.direction === "outcoming" ? sum : -sum,
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
		participants,
		syncableParticipants,
		loadingParticipants,
		createdParticipants,
		nonCreatedParticipants,
		desyncedParticipants,
		syncedParticipants,
	};
};

export type Participant = ReturnType<
	typeof useParticipants
>["participants"][number];
