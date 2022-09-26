import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"itemParticipants.update">["update"]
	): UpdateFn<ReceiptItemPart> =>
	(part) => {
		switch (update.type) {
			case "part":
				return { ...part, part: update.part };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"itemParticipants.update">["update"]
	): SnapshotFn<ReceiptItemPart> =>
	(snapshot) =>
	(item) => {
		switch (update.type) {
			case "part":
				return { ...item, part: snapshot.part };
		}
	};

export const options: UseContextedMutationOptions<
	"itemParticipants.update",
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) => ({
		revertFns: cache.receiptItems.updateRevert(trpcContext, {
			getReceiptItem: noop,
			getReceiptParticipant: noop,
			getReceiptItemPart: (controller) =>
				controller.update(
					receiptId,
					variables.itemId,
					variables.userId,
					applyUpdate(variables.update),
					getRevert(variables.update)
				),
		}),
	}),
	errorToastOptions: () => (error) => ({
		text: `Error updating participant(s): ${error.message}`,
	}),
};
