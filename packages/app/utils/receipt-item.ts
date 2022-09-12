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

type ReceiptItemWithSums = {
	id: ReceiptItemsId;
	price: number;
	partsSums: { userId: UsersId; sum: number }[];
};

const calculateReceiptItemsWithSums = (
	items: ReceiptItem[],
	userIds: UsersId[],
	decimalsDigits = 2
): ReceiptItemWithSums[] =>
	items.map((item) => {
		const decimalsPower = 10 ** decimalsDigits;
		const itemPriceDecimal = item.quantity * item.price * decimalsPower;
		const totalParts = item.parts.reduce(
			(acc, itemPart) => acc + itemPart.part,
			0
		);
		const approximatePartsSums = item.parts.map((itemPart) =>
			Math.floor((itemPart.part / totalParts) * itemPriceDecimal)
		);
		const approximatePartsSum = approximatePartsSums.reduce(
			(acc, sum) => acc + sum,
			0
		);
		const deltaDecimal = itemPriceDecimal - approximatePartsSum;
		const deltaPartForEveryone = Math.floor(deltaDecimal / item.parts.length);
		const deltaPartThresholdIndex = deltaDecimal % item.parts.length;
		return {
			id: item.id,
			price: itemPriceDecimal,
			partsSums: [...item.parts]
				.sort((a, b) => userIds.indexOf(a.userId) - userIds.indexOf(b.userId))
				.map((itemPart, index) => ({
					userId: itemPart.userId,
					sum:
						(approximatePartsSums[index]! +
							deltaPartForEveryone +
							(index < deltaPartThresholdIndex ? 1 : 0)) /
						decimalsPower,
				})),
		};
	});

export const getParticipantSums = <T extends ReceiptParticipant>(
	receiptId: ReceiptsId,
	items: ReceiptItem[],
	participants: T[]
) => {
	const sortedParticipants = [...participants].sort(
		(a, b) => a.added.valueOf() - b.added.valueOf()
	);
	const receiptItemsWithSums = calculateReceiptItemsWithSums(
		items,
		rotate(
			sortedParticipants.map((participant) => participant.remoteUserId),
			getIndexByString(receiptId)
		)
	);
	return sortedParticipants.map((participant) => ({
		...participant,
		sum: items.reduce(
			(acc, item) =>
				acc +
				(receiptItemsWithSums
					.find((itemWithSum) => itemWithSum.id === item.id)!
					.partsSums.find(
						(partSum) => partSum.userId === participant.remoteUserId
					)?.sum ?? 0),
			0
		),
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
