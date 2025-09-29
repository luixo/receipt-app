import type { TFunction } from "i18next";

import type { ReceiptItemId } from "~db/ids";

export const getPayersItems = (t: TFunction, itemIds: ReceiptItemId[]) =>
	t("toasts.payersGenitive", {
		ns: "receipts",
		count: itemIds.length,
	});
