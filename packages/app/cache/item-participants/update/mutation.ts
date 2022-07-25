import { cache, Cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

const applyUpdate = (
	part: ReceiptItemPart,
	update: TRPCMutationInput<"item-participants.update">["update"]
): ReceiptItemPart => {
	switch (update.type) {
		case "part":
			return { ...part, part: update.part };
	}
};

const getRevert =
	(
		snapshot: ReceiptItemPart,
		update: TRPCMutationInput<"item-participants.update">["update"]
	): Revert<ReceiptItemPart> =>
	(item) => {
		switch (update.type) {
			case "part":
				return { ...item, part: snapshot.part };
		}
	};

export const mutationOptions: UseContextedMutationOptions<
	"item-participants.update",
	Revert<ReceiptItemPart> | undefined,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		const snapshot = cache.receiptItems.get.receiptItemPart.update(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => applyUpdate({ ...part, dirty: true }, variables.update)
		);
		return snapshot && getRevert(snapshot, variables.update);
	},
	onSuccess: (trpcContext, input) => (_error, variables) => {
		cache.receiptItems.get.receiptItemPart.update(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({ ...part, dirty: false })
		);
	},
	onError: (trpcContext, input) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		cache.receiptItems.get.receiptItemPart.update(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			revert
		);
	},
};
