import { ReceiptItemsId, UsersId } from "next-app/src/db/models";
import { TRPCQueryOutput } from "../trpc";

type ReceiptItemsResult = TRPCQueryOutput<"receipt-items.get">;
type ReceiptItem = ReceiptItemsResult["items"][number];

type ReceiptItemWithSums = {
	id: ReceiptItemsId;
	price: number;
	partsSums: { userId: UsersId; sum: number }[];
};

export const calculateReceiptItemsWithSums = (
	items: ReceiptItem[],
	userIds: UsersId[],
	decimalsDigits = 2
): ReceiptItemWithSums[] => {
	return items.map((item) => {
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
};
