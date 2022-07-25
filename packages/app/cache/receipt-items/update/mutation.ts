import { cache, Cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { updateReceiptSum } from "app/utils/receipt";

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
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (updateObject) => {
		const snapshot = cache.receiptItems.get.receiptItem.update(
			trpcContext,
			input,
			updateObject.id,
			(item) => applyUpdate({ ...item, dirty: true }, updateObject.update)
		);
		return snapshot && getRevert(snapshot, updateObject.update);
	},
	onSuccess: (trpcContext, input) => (_value, updateObject) => {
		cache.receiptItems.get.receiptItem.update(
			trpcContext,
			input,
			updateObject.id,
			(item) => ({
				...item,
				dirty: false,
			})
		);
		if (
			updateObject.update.type === "price" ||
			updateObject.update.type === "quantity"
		) {
			updateReceiptSum(trpcContext, input);
		}
	},
	onError: (trpcContext, input) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		cache.receiptItems.get.receiptItem.update(
			trpcContext,
			input,
			variables.id,
			revert
		);
	},
};
