import {
	entries,
	fromEntries,
	keys,
	mapValues,
	omitBy,
	unique,
	values,
} from "remeda";

import type { ReceiptId, ReceiptItemId, UserId } from "~db/ids";
import { rotate } from "~utils/array";
import type { Temporal } from "~utils/date";
import { compare } from "~utils/date";
import { getIndexByString } from "~utils/hash";

type ReceiptItem = {
	id: ReceiptItemId;
	quantity: number;
	price: number;
	consumers: {
		userId: UserId;
		part: number;
	}[];
	payers: {
		userId: UserId;
		part: number;
	}[];
};
type ReceiptParticipant = {
	createdAt: Temporal.ZonedDateTime;
	userId: UserId;
};

const getSortUsersByReceipt = (
	receiptId: ReceiptId,
	participants: ReceiptParticipant[],
) => {
	const mappedParticipants = rotate(
		participants.toSorted((participantA, participantB) => {
			const createdDelta = compare.zonedDateTime(
				participantA.createdAt,
				participantB.createdAt,
			);
			const userIdComparison = participantA.userId.localeCompare(
				participantB.userId,
			);
			return createdDelta || userIdComparison;
		}),
		getIndexByString(receiptId),
	);
	return (userA: UserId, userB: UserId) => {
		const participantAIndex = mappedParticipants.findIndex(
			(participant) => participant.userId === userA,
		);
		const participantBIndex = mappedParticipants.findIndex(
			(participant) => participant.userId === userB,
		);
		if (participantAIndex === -1 || participantBIndex === -1) {
			throw new Error(
				`Expected to have participants matched in sorting by receipt`,
			);
		}
		return participantAIndex - participantBIndex;
	};
};

export const getItemCalculations = (
	sum: number,
	parts: Record<UserId, number>,
) => {
	const partsAmount = values(parts).reduce((acc, part) => acc + part, 0);
	const sumsByUser = mapValues(parts, (part) => (part / partsAmount) * sum);
	const flooredByUsers = mapValues(sumsByUser, (sumByUser) =>
		Math.floor(sumByUser),
	);
	const shortagesByUsers = mapValues(
		sumsByUser,
		(sumByUser) => sumByUser - Math.floor(sumByUser),
	);
	const flooredSum = values(flooredByUsers).reduce(
		(acc, flooredByUser) => acc + flooredByUser,
		0,
	);
	return {
		flooredByUsers,
		shortagesByUsers,
		leftover: sum - flooredSum,
	};
};

const distributeLeftovers = (
	shortagesByUsers: Record<UserId, number>,
	initialLeftover: number,
	sortUsers: (userA: UserId, userB: UserId) => number,
) => {
	const reimbursedByUsers = mapValues(shortagesByUsers, (shortage) =>
		Math.trunc(shortage),
	);
	const totalReimbursed = values(reimbursedByUsers).reduce(
		(acc, reimbursed) => acc + reimbursed,
		0,
	);
	const notReimbursedByUsers = mapValues(
		shortagesByUsers,
		(shortage, userId) => shortage - (reimbursedByUsers[userId] ?? 0),
	);
	const luckyLeftover = initialLeftover - totalReimbursed;
	if (luckyLeftover < 0) {
		throw new Error("Unexpected negative lucky leftover");
	}
	if (luckyLeftover > keys(shortagesByUsers).length) {
		throw new Error("Unexpected lucky leftover bigger than users left");
	}

	const notReimbursedOrder = entries(notReimbursedByUsers).sort(
		([userA, userANotReimbursed], [userB, userBNotReimbursed]) => {
			const notReimbursedDelta = userBNotReimbursed - userANotReimbursed;
			return notReimbursedDelta || sortUsers(userA, userB);
		},
	);
	const luckyLeftovers = fromEntries(
		notReimbursedOrder.map(([userId], index) => [
			userId,
			index + 1 <= luckyLeftover ? 1 : 0,
		]),
	);
	const totalByUsers = mapValues(
		reimbursedByUsers,
		(reimbursed, userId) => reimbursed + (luckyLeftovers[userId] ?? 0),
	);
	if (
		initialLeftover !== values(totalByUsers).reduce((acc, sum) => acc + sum, 0)
	) {
		throw new Error(
			"Unexpected total after reimbursement differs from initial leftover",
		);
	}
	return totalByUsers;
};

const getUserSums = (
	sum: number,
	parts: Record<UserId, number>,
	sortUsers: (userA: UserId, userB: UserId) => number,
) => {
	const { flooredByUsers, shortagesByUsers, leftover } = getItemCalculations(
		sum,
		parts,
	);
	const distributedLeftovers = distributeLeftovers(
		shortagesByUsers,
		leftover,
		sortUsers,
	);
	return mapValues(
		flooredByUsers,
		(value, userId) => value + (distributedLeftovers[userId] ?? 0),
	);
};

const getPayersSums = (
	commonPayers: ReceiptItem["consumers"],
	items: ReceiptItem[],
	fromUnitToSubunit: (input: number) => number,
	sortUsers: (userA: UserId, userB: UserId) => number,
) => {
	const separatelyPayedItems = items.filter((item) => item.payers.length !== 0);
	const separatelyPayedSum = separatelyPayedItems.reduce(
		(acc, item) => acc + fromUnitToSubunit(item.price * item.quantity),
		0,
	);
	const commonlyPayedItems = items.filter((item) => item.payers.length === 0);
	const commonlyPayedSum = commonlyPayedItems.reduce(
		(acc, item) => acc + fromUnitToSubunit(item.price * item.quantity),
		0,
	);

	const separatelyPayedSumsByItem = separatelyPayedItems.map((item) => ({
		itemId: item.id,
		sums: getUserSums(
			fromUnitToSubunit(item.price * item.quantity),
			fromEntries(item.payers.map(({ userId, part }) => [userId, part])),
			sortUsers,
		),
	}));
	const commonlyPayedSums = getUserSums(
		commonlyPayedSum,
		fromEntries(commonPayers.map(({ userId, part }) => [userId, part])),
		sortUsers,
	);
	const allPayers = unique<UserId[]>([
		...separatelyPayedSumsByItem.flatMap((item) => keys(item.sums)),
		...keys(commonlyPayedSums),
	]);
	const payersSums = fromEntries(
		allPayers.map((payerId) => {
			const commonPayedSum = commonlyPayedSums[payerId] ?? 0;
			const itemPayedSums = separatelyPayedSumsByItem.map((sumsByUsers) => ({
				itemId: sumsByUsers.itemId,
				sum: sumsByUsers.sums[payerId] ?? 0,
			}));
			return [
				payerId,
				{
					common: commonPayedSum,
					items: itemPayedSums,
					total:
						commonPayedSum +
						itemPayedSums.reduce((acc, { sum }) => acc + sum, 0),
				},
			];
		}),
	);
	if (
		separatelyPayedSum + commonlyPayedSum !==
		values(payersSums).reduce((acc, { total }) => acc + total, 0)
	) {
		throw new Error("Unexpected total payed sum differs from payer sums");
	}
	return payersSums;
};

/*
	How does distributing sums work?
	Calculation consist of three phases:
	- calculate floored sums, participant shortages and leftovers
	- reimbursed shortages with some of leftovers
	- distribute lucky leftovers

	E.g.:
	- receipt has 3 items - 40.01$, 4.01$ and 4$ (I1, I2 and I3)
	- 3 participants (P1, P2 and P3) share 4$ and 4.01$ items equally, 40.01$ has P1 10/12, the rest have 1/12
	
	First, we calculate floored sums, participant shortage and leftovers for every item.
	For I1 those would be:
	- floored sums: P1 3334, P2 333, P3 333
	- participant shortage: P1 0.1(6), P2 0.41(6), P3 0.41(6)
	- leftover: 4001 - 3334 - 333 - 333 = 1
	For I2 those would be:
	- floored sums: 133 each participant
	- participant shortage: 0.(6) each participant
	- leftover: 401 - 133 - 133 - 133 = 2
	For I3 those would be:
	- floored sums: 133 each participant
	- participant shortage: 0.(3) each participant
	- leftover: 400 - 133 - 133 - 133 = 1

	Slice by participants:
	P1:
	- floored sum is 3334 + 133 + 133 = 3600
	- shortage is 0.1(6) + 0.(6) + 0.(3) = 1.1(6)
	P2 and P3:
	- floored sum is 333 + 133 + 133 = 599
	- shortage is 0.41(6) + 0.(6) + 0.(3) = 1.41(6)

	Total leftover is 1 + 2 + 1 = 4

	Second, we reimburse shortages - the integer ones - for each participant.
	Every participant gets 1 as reimburse, and is left with non-reimbursed shortage:
	P1: 0.1(6)
	P2 and P3: 0.41(6)

	Total leftover is now 1.

	Third, we order participants by non-reimbursed shortage:
	(1st place) P2 and P3
	(2nd place) P1

	Fourth, we roll the dice* to figure out who will recieve the leftovers first:
	(1st) P2 (wins in dice roll)
	(2nd) P3
	(3rd) P1

	* Die orders participants by creation date, if equal - by user id,
	then rotate the array of participants based on receipt id (statistically random)

	Finally, we give one cent to each participant with index less than amount of leftover (which is 1)

	Final slice by participant:
	P1: total 3601 (36.01$)
	- floored sum is 3600
	- reimbursed shortage is 1
	- lucky leftover gave 0
	P2: total 601 (6.01$)
	- floored sum is 599
	- reimbursed shortage is 1
	- lucky leftover gave 1
	P3: total 600 (6.00$)
	- floored sum is 599
	- reimbursed shortage is 1
	- lucky leftover gave 0
*/
export const getParticipantSums = (
	receiptId: ReceiptId,
	ownerUserId: UserId,
	items: ReceiptItem[],
	participants: ReceiptParticipant[],
	payers: ReceiptItem["consumers"],
	fromUnitToSubunit: (input: number) => number,
	fromSubunitToUnit: (input: number) => number,
) => {
	const totalSum = items.reduce(
		(acc, item) => acc + fromUnitToSubunit(item.price * item.quantity),
		0,
	);
	const sortUsersByReceipt = getSortUsersByReceipt(receiptId, participants);
	const allParticipantsIds = fromEntries(
		participants.map((participant) => [participant.userId, 0]),
	);
	const itemCalculations = items
		.filter((item) => item.consumers.length !== 0)
		.map((item) => ({
			id: item.id,
			...getItemCalculations(
				fromUnitToSubunit(item.price * item.quantity),
				fromEntries(item.consumers.map(({ userId, part }) => [userId, part])),
			),
		}));
	const flooredByUsers = itemCalculations.reduce<Record<UserId, number>>(
		(acc, itemCalculation) =>
			mapValues(
				allParticipantsIds,
				(_, userId) =>
					(acc[userId] ?? 0) + (itemCalculation.flooredByUsers[userId] ?? 0),
			),
		{},
	);
	const shortagesByUsers = itemCalculations.reduce<Record<UserId, number>>(
		(acc, itemCalculation) =>
			mapValues(
				allParticipantsIds,
				(_, userId) =>
					(acc[userId] ?? 0) + (itemCalculation.shortagesByUsers[userId] ?? 0),
			),
		{},
	);
	const totalLeftover = itemCalculations.reduce(
		(acc, itemCalculation) => acc + itemCalculation.leftover,
		0,
	);
	const distributedLeftovers = distributeLeftovers(
		// Not distributing leftovers amongst those who don't participate
		omitBy(shortagesByUsers, (value) => value === 0) as Record<UserId, number>,
		totalLeftover,
		sortUsersByReceipt,
	);
	const debtSums = mapValues(
		flooredByUsers,
		(value, userId) => value + (distributedLeftovers[userId] ?? 0),
	);

	if (totalSum !== values(debtSums).reduce((acc, sum) => acc + sum, 0)) {
		throw new Error("Unexpected total debt sum differs from debtors sums");
	}

	const surePayers =
		payers.length === 0
			? [
					{
						userId: ownerUserId,
						part: 1,
					},
				]
			: payers;
	const payersSums = getPayersSums(
		surePayers,
		items,
		fromUnitToSubunit,
		sortUsersByReceipt,
	);

	return participants.map(({ userId }) => {
		const payerObject = payersSums[userId] ?? {
			common: 0,
			items: [],
			total: 0,
		};
		const flooredDebts = itemCalculations
			.map((item) => ({
				itemId: item.id,
				sum: item.flooredByUsers[userId] ?? 0,
				shortage: item.shortagesByUsers[userId] ?? 0,
			}))
			.filter(({ sum, shortage }) => sum !== 0 || shortage !== 0);
		// Sometimes there's a rounding error around here
		const totalPayment = Math.round(payerObject.total);
		// Sometimes there's a rounding error around here
		const totalDebt = Math.round(debtSums[userId] ?? 0);
		return {
			userId,
			payment: {
				// Sometimes there's a rounding error around here
				total: fromSubunitToUnit(totalPayment),
				common: fromSubunitToUnit(payerObject.common),
				items: payerObject.items.map((item) => ({
					...item,
					sum: fromSubunitToUnit(item.sum),
				})),
			},
			debt: {
				total: fromSubunitToUnit(totalDebt),
				items: flooredDebts.map((item) => ({
					...item,
					sum: fromSubunitToUnit(item.sum),
				})),
				leftover: fromSubunitToUnit(distributedLeftovers[userId] ?? 0),
			},
			balance: fromSubunitToUnit(totalDebt - totalPayment),
		};
	});
};
