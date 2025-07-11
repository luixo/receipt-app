import { entries, fromEntries, mapValues, values } from "remeda";

import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";
import { rotate } from "~utils/array";
import type { Temporal } from "~utils/date";
import { compare } from "~utils/date";
import { getIndexByString } from "~utils/hash";

type ReceiptItem = {
	id: ReceiptItemsId;
	quantity: number;
	price: number;
	consumers: {
		userId: UsersId;
		part: number;
	}[];
};
type ReceiptParticipant = {
	createdAt: Temporal.ZonedDateTime;
	userId: UsersId;
};

export const getItemCalculations = (
	itemSum: number,
	consumerParts: Record<UsersId, number>,
) => {
	const partsAmount = values(consumerParts).reduce(
		(acc, part) => acc + part,
		0,
	);
	const sumByUser = mapValues(
		consumerParts,
		(part) => (part / partsAmount) * itemSum,
	);
	const sumTotal = values(sumByUser).reduce(
		(acc, sum) => acc + Math.floor(sum),
		0,
	);
	const sums = mapValues(sumByUser, (sum) => [sum, Math.floor(sum)]) as Record<
		UsersId,
		[number, number]
	>;
	return {
		sumFlooredByParticipant: mapValues(
			sums,
			([, flooredSum]) => flooredSum,
		) as Record<UsersId, number>,
		leftover: itemSum - sumTotal,
		shortageByParticipant: mapValues(
			sums,
			([sum, flooredSum]) => sum - flooredSum,
		) as Record<UsersId, number>,
	};
};

const getPayersSums = <
	P extends ReceiptItem["consumers"][number],
	I extends ReceiptItem,
>(
	receiptId: ReceiptsId,
	payers: P[],
	items: I[],
	fromUnitToSubunit: (input: number) => number,
) => {
	const { shortageByParticipant, sumFlooredByParticipant, leftover } =
		getItemCalculations(
			items.reduce(
				(acc, item) => acc + fromUnitToSubunit(item.price * item.quantity),
				0,
			),
			fromEntries(payers.map(({ userId, part }) => [userId, part])),
		);
	const orderedPayerIds = rotate(
		payers
			.filter((payer) => {
				const sum = sumFlooredByParticipant[payer.userId];
				return sum && sum >= 0;
			})
			.sort((a, b) => a.userId.localeCompare(b.userId)),
		getIndexByString(receiptId),
	)
		.sort((payerA, payerB) => {
			const shortageA = shortageByParticipant[payerA.userId] ?? 0;
			const shortageB = shortageByParticipant[payerB.userId] ?? 0;
			return shortageB - shortageA;
		})
		.map(({ userId }) => userId);
	const luckyLeftovers = orderedPayerIds.reduce<Record<UsersId, number>>(
		(acc, id, index) => ({ ...acc, [id]: index < leftover ? 1 : 0 }),
		{},
	);
	return payers.map((payer) => ({
		...payer,
		sumDecimals: Math.round(
			(sumFlooredByParticipant[payer.userId] ?? 0) +
				(luckyLeftovers[payer.userId] ?? 0),
		),
	}));
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
export const getParticipantSums = <
	P extends ReceiptParticipant,
	R extends ReceiptItem["consumers"][number],
	I extends ReceiptItem,
>(
	receiptId: ReceiptsId,
	items: I[],
	participants: P[],
	payers: R[],
	fromUnitToSubunit: (input: number) => number,
) => {
	const payersSums = getPayersSums(receiptId, payers, items, fromUnitToSubunit);
	const {
		sumFlooredByParticipant,
		shortageByParticipant,
		leftoverBeforeReimburse,
	} = items
		.filter((item) => item.consumers.length !== 0)
		.map((item) =>
			getItemCalculations(
				fromUnitToSubunit(item.price * item.quantity),
				item.consumers.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
		)
		.reduce<{
			sumFlooredByParticipant: Record<UsersId, number>;
			shortageByParticipant: Record<UsersId, number>;
			leftoverBeforeReimburse: number;
		}>(
			(acc, item) => ({
				sumFlooredByParticipant: entries(item.sumFlooredByParticipant).reduce(
					(subacc, [id, sum]) => ({
						...subacc,
						[id]: (subacc[id] || 0) + sum,
					}),
					acc.sumFlooredByParticipant,
				),
				shortageByParticipant: entries(item.shortageByParticipant).reduce(
					(subacc, [id, shortage]) => ({
						...subacc,
						[id]: (subacc[id] || 0) + shortage,
					}),
					acc.shortageByParticipant,
				),
				leftoverBeforeReimburse: acc.leftoverBeforeReimburse + item.leftover,
			}),
			{
				sumFlooredByParticipant: {},
				shortageByParticipant: {},
				leftoverBeforeReimburse: 0,
			},
		);

	const reimbursedShortages = mapValues(shortageByParticipant, (shortage) => {
		const integer = Math.trunc(shortage);
		return {
			reimbursed: integer,
			notReimbursed: shortage - integer,
		};
	}) as Record<
		UsersId,
		{
			reimbursed: number;
			notReimbursed: number;
		}
	>;
	const totalReimbursedShortage = values(reimbursedShortages).reduce(
		(acc, { reimbursed }) => acc + reimbursed,
		0,
	);
	const leftover = leftoverBeforeReimburse - totalReimbursedShortage;

	const nonEmptyParticipants = participants
		.filter((participant) => {
			const sum = sumFlooredByParticipant[participant.userId];
			return sum && sum >= 0;
		})
		.sort((a, b) => {
			const leftoverA = reimbursedShortages[a.userId]?.notReimbursed ?? 0;
			const leftoverB = reimbursedShortages[b.userId]?.notReimbursed ?? 0;
			const leftoverDelta = leftoverB - leftoverA;
			if (leftoverDelta === 0) {
				const createdDelta = compare.zonedDateTime(a.createdAt, b.createdAt);
				if (createdDelta === 0) {
					return a.userId.localeCompare(b.userId);
				}
				return createdDelta;
			}
			return leftoverDelta;
		});
	const nonEmptyParticipantsPinned = rotate(
		nonEmptyParticipants,
		getIndexByString(receiptId),
	);

	if (leftover > nonEmptyParticipantsPinned.length) {
		throw new Error("Unexpected leftover bigger than participants left");
	}
	// 1c left for a few lucky ones
	const leftoverAmount = leftover % nonEmptyParticipantsPinned.length;
	// leftoverAmount === 0 with some leftover means that everyone gets a 1c leftover
	// Aamount of leftover cents roughly equals to shortage sum (because of rounding)
	const leftoverThresholdIndex =
		leftoverAmount === 0 && leftover !== 0
			? nonEmptyParticipantsPinned.length
			: leftoverAmount;
	const luckyLeftovers = nonEmptyParticipantsPinned.reduce<
		Record<UsersId, number>
	>(
		(acc, { userId: id }, index) => ({
			...acc,
			[id]: index < leftoverThresholdIndex ? 1 : 0,
		}),
		{},
	);

	return participants.map(({ userId, ...participant }) => {
		const debtSumDecimals = Math.round(
			(sumFlooredByParticipant[userId] ?? 0) +
				(reimbursedShortages[userId]?.reimbursed ?? 0) +
				(luckyLeftovers[userId] ?? 0),
		);
		const payer = payersSums.find((payerSum) => userId === payerSum.userId);
		return {
			...participant,
			userId,
			debtSumDecimals,
			paySumDecimals: payer?.sumDecimals ?? 0,
			payPart: payer?.part,
		};
	});
};
