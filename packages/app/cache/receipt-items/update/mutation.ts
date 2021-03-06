import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];

const applyUpdate = (
	item: ReceiptItem,
	update: TRPCMutationInput<"receipt-items.update">["update"]
): ReceiptItem => {
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
		snapshot: ReceiptItem,
		update: TRPCMutationInput<"receipt-items.update">["update"]
	): Revert<ReceiptItem> =>
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

export const mutationOptions: UseContextedMutationOptions<
	"receipt-items.update",
	Revert<ReceiptItem> | undefined,
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (updateObject) => {
		const snapshot = cache.receiptItems.get.receiptItem.update(
			trpcContext,
			receiptId,
			updateObject.id,
			(item) => applyUpdate(item, updateObject.update)
		);
		return snapshot && getRevert(snapshot, updateObject.update);
	},
	onSuccess: (trpcContext, receiptId) => (_value, updateObject) => {
		if (
			updateObject.update.type === "price" ||
			updateObject.update.type === "quantity"
		) {
			cache.receipts.utils.updateReceiptSum(trpcContext, receiptId);
		}
	},
	onError: (trpcContext, receiptId) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		cache.receiptItems.get.receiptItem.update(
			trpcContext,
			receiptId,
			variables.id,
			revert
		);
	},
};
