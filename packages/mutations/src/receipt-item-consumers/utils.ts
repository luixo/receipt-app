import type { ReceiptItemsId, ReceiptsId } from "~db/models";

export const getConsumersText = (
	itemsIds: ReceiptItemsId[],
	receiptIds: ReceiptsId[],
) => {
	const payersAmount = itemsIds.filter(
		(itemId, index) => itemId === receiptIds[index],
	).length;
	const consumersAmount = itemsIds.length - payersAmount;
	const payersText =
		payersAmount > 1
			? `${payersAmount} payers`
			: payersAmount > 0
				? "payer"
				: undefined;
	const consumersText =
		consumersAmount > 1
			? `${consumersAmount} consumers`
			: consumersAmount > 0
				? "consumer"
				: undefined;
	return [payersText, consumersText].filter(Boolean).join(" and ");
};
