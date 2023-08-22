import { cache } from "app/cache";
import type { SnapshotFn, UpdateFn } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

import { updateReceiptSum } from "./utils";

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];

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
			case "locked":
				return { ...item, locked: update.locked };
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
			case "locked":
				return { ...item, locked: snapshot.locked };
		}
	};

export const options: UseContextedMutationOptions<
	"receiptItems.update",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (updateObject) =>
		cache.receiptItems.updateRevert(controllerContext, {
			getReceiptItem: (controller) =>
				controller.update(
					receiptId,
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getReceiptParticipant: undefined,
			getReceiptItemPart: undefined,
		}),
	onSuccess: (controllerContext, receiptId) => (_value, updateObject) => {
		if (
			updateObject.update.type === "price" ||
			updateObject.update.type === "quantity"
		) {
			updateReceiptSum(controllerContext, receiptId);
		}
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating item: ${error.message}`,
	}),
};
