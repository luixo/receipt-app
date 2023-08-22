import { cache } from "app/cache";
import type { SnapshotFn, UpdateFn } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"itemParticipants.update">["update"],
	): UpdateFn<ReceiptItemPart> =>
	(part) => {
		switch (update.type) {
			case "part":
				return { ...part, part: update.part };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"itemParticipants.update">["update"],
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
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receiptItems.updateRevert(controllerContext, {
			getReceiptItem: undefined,
			getReceiptParticipant: undefined,
			getReceiptItemPart: (controller) =>
				controller.update(
					receiptId,
					variables.itemId,
					variables.userId,
					applyUpdate(variables.update),
					getRevert(variables.update),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error updating participant(s): ${error.message}`,
	}),
};
