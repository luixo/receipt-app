import { cache } from "~app/cache";
import type { SnapshotFn, UpdateFn } from "~app/cache/utils";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~web/db/models";

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
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.updateItem(
					receiptId,
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error updating item: ${error.message}`,
	}),
};
