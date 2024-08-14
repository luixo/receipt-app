import { entries, mapValues, values } from "remeda";

import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";
import { rotate } from "~utils/array";
import { getIndexByString } from "~utils/hash";

export const getDecimalsPower = (decimalDigits = 2) => 10 ** decimalDigits;

type ReceiptItem = {
	id: ReceiptItemsId;
	quantity: number;
	price: number;
	parts: {
		userId: UsersId;
		part: number;
	}[];
};
type ReceiptParticipant = {
	added: Date;
	userId: UsersId;
};

export const getItemCalculations = (
	itemSum: number,
	parts: Record<string, number>,
	decimalDigits = 2,
) => {
	const decimalsPower = getDecimalsPower(decimalDigits);
	const sumRounded = Math.round(itemSum * decimalsPower);
	const partsAmount = values(parts).reduce((acc, part) => acc + part, 0);
	const sumByUser = mapValues(
		parts,
		(part) => (part / partsAmount) * sumRounded,
	);
	const sumTotal = values(sumByUser).reduce(
		(acc, sum) => acc + Math.floor(sum),
		0,
	);
	return {
		sumFlooredByParticipant: mapValues(sumByUser, (sum) => Math.floor(sum)),
		leftover: sumRounded - sumTotal,
		shortageByParticipant: mapValues(sumByUser, (sum) => sum - Math.floor(sum)),
	};
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

	Fourth, we roll the (determenistic) dice to figure out who will recieve the leftovers first:
	(1st) P2 (wins in dice roll)
	(2nd) P3
	(3rd) P1

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
	I extends ReceiptItem,
>(
	receiptId: ReceiptsId,
	items: I[],
	participants: P[],
	decimalsDigits = 2,
) => {
	const decimalsPower = getDecimalsPower(decimalsDigits);
	const {
		sumFlooredByParticipant,
		shortageByParticipant,
		leftoverBeforeReimburse,
	} = items
		.filter((item) => item.parts.length !== 0)
		.map((item) =>
			getItemCalculations(
				item.price * item.quantity,
				item.parts.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
				decimalsDigits,
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

	const nonEmptyParticipantIds = rotate(
		participants
			.filter((participant) => {
				const sum = sumFlooredByParticipant[participant.userId];
				return sum && sum >= 0;
			})
			.sort((a, b) => a.added.valueOf() - b.added.valueOf()),
		getIndexByString(receiptId),
	)
		.sort((a, b) => {
			const leftoverA = reimbursedShortages[a.userId]?.notReimbursed ?? 0;
			const leftoverB = reimbursedShortages[b.userId]?.notReimbursed ?? 0;
			return leftoverB - leftoverA;
		})
		.map(({ userId }) => userId);

	if (leftover > nonEmptyParticipantIds.length) {
		throw new Error("Unexpected leftover bigger than participants left");
	}
	// 1c left for a few lucky ones
	const leftoverAmount = leftover % nonEmptyParticipantIds.length;
	// leftoverAmount === 0 with some leftover means that everyone gets a 1c leftover
	// Aamount of leftover cents roughly equals to shortage sum (because of rounding)
	const leftoverThresholdIndex =
		leftoverAmount === 0 && leftover !== 0
			? nonEmptyParticipantIds.length
			: leftoverAmount;
	const luckyLeftovers = nonEmptyParticipantIds.reduce<Record<UsersId, number>>(
		(acc, id, index) => ({
			...acc,
			[id]: index < leftoverThresholdIndex ? 1 : 0,
		}),
		{},
	);

	return participants.map(({ userId, ...participant }) => ({
		...participant,
		userId,
		sum:
			Math.round(
				(sumFlooredByParticipant[userId] ?? 0) +
					(reimbursedShortages[userId]?.reimbursed ?? 0) +
					(luckyLeftovers[userId] ?? 0),
			) / decimalsPower,
	}));
};
