import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptItems.update">["update"],
	): UpdateFn<ReceiptItem> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "price":
				return { ...item, price: update.price };
			case "quantity":
				return { ...item, quantity: update.quantity };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receiptItems.update">["update"],
	): SnapshotFn<ReceiptItem> =>
	(snapshot) =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: snapshot.name };
			case "price":
				return { ...item, price: snapshot.price };
			case "quantity":
				return { ...item, quantity: snapshot.quantity };
		}
	};

export const options: UseContextedMutationOptions<
	"receiptItems.update",
	{ receiptId: ReceiptsId }
> = {
	mutationKey: "receiptItems.update",
	onMutate:
		(controllerContext, { receiptId }) =>
		(updateObject) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItem(
						receiptId,
						updateObject.id,
						applyUpdate(updateObject.update),
						getRevert(updateObject.update),
					),
				getPaged: undefined,
			}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.updateItem.error", {
				ns: "receipts",
				itemsCount: errors.length,
				errors,
			}),
		}),
};
