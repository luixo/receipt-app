import { Props as UserProps } from "app/components/app/user";
import { TRPCQueryOutput } from "app/trpc";
import { rotate } from "app/utils/array";
import { getIndexByString } from "app/utils/hash";
import { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/src/db/models";

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
	localUserId: UsersId | null;
	remoteUserId: UsersId;
};

const spreadCalculation = <T extends string>(
	total: number,
	parts: { part: number; id: T }[],
	ids: T[]
) => {
	// Say, we split 10$ by 3 parts
	// We round 10.0000002$ (passed as 1000 cents) to 10$
	const totalDecimal = Math.round(total);
	// 3 parts
	const partsAmount = parts.reduce((acc, itemPart) => acc + itemPart.part, 0);
	// 333c, 333c and 333c
	const partsTotals = parts.reduce<Record<T, number>>(
		(partsAcc, itemPart) => ({
			...partsAcc,
			[itemPart.id]: Math.floor((itemPart.part / partsAmount) * totalDecimal),
		}),
		{} as Record<T, number>
	);
	// 333c + 333c + 333c = 999c
	const partsTotal = (Object.values(partsTotals) as number[]).reduce(
		(acc, sum) => acc + sum,
		0
	);
	// 1c leftover
	const leftoversAmount = totalDecimal - partsTotal;
	// 0c for everyone (should be like that every time, actually)
	const leftoverForEveryone = Math.floor(leftoversAmount / parts.length);
	// Who will get the leftovers from deltaDecimal? First 1 element
	const leftoverThresholdIndex = leftoversAmount % parts.length;
	return [...parts]
		.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
		.map((part, index) => ({
			id: part.id,
			sum:
				partsTotals[part.id] +
				leftoverForEveryone +
				(index < leftoverThresholdIndex ? 1 : 0),
		}));
};

export const getParticipantSums = <T extends ReceiptParticipant>(
	receiptId: ReceiptsId,
	items: ReceiptItem[],
	participants: T[],
	decimalsDigits = 2
) => {
	const sortedParticipants = [...participants].sort(
		(a, b) => a.added.valueOf() - b.added.valueOf()
	);
	const rotatedUserIds = rotate(
		sortedParticipants.map((participant) => participant.remoteUserId),
		getIndexByString(receiptId)
	);
	const decimalsPower = 10 ** decimalsDigits;
	const receiptItemsWithSums = items.map((item) => ({
		id: item.id,
		partsSums: spreadCalculation(
			item.price * item.quantity * decimalsPower,
			item.parts.map(({ userId, part }) => ({ id: userId, part })),
			rotatedUserIds
		),
	}));
	const participantsSums = receiptItemsWithSums.reduce<
		Partial<Record<UsersId, number>>
	>((acc, item) => {
		item.partsSums.forEach(({ id, sum }) => {
			acc[id] = (acc[id] || 0) + sum;
		});
		return acc;
	}, {});
	return sortedParticipants.map((participant) => ({
		...participant,
		sum:
			Math.round(participantsSums[participant.remoteUserId] ?? 0) /
			decimalsPower,
	}));
};

export const convertParticipantToUser = (
	participant: TRPCQueryOutput<"receiptItems.get">["participants"][number]
): UserProps["user"] => ({
	id: participant.localUserId || participant.remoteUserId,
	name: participant.name,
	publicName: participant.publicName,
	email: participant.email,
});
