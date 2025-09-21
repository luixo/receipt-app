import type { TFunction } from "i18next";

import type { ReceiptId, ReceiptItemId } from "~db/ids";

export const getConsumersItems = (
	t: TFunction,
	itemIds: ReceiptItemId[],
	receiptIds: ReceiptId[],
) => {
	const payersAmount = itemIds.filter(
		(itemId, index) => itemId === receiptIds[index],
	).length;
	const consumersAmount = itemIds.length - payersAmount;
	return [
		consumersAmount
			? t("toasts.consumersGenitive", {
					ns: "receipts",
					count: consumersAmount,
				})
			: undefined,
		payersAmount
			? t("toasts.payersGenitive", { ns: "receipts", count: payersAmount })
			: undefined,
	].filter(Boolean);
};
