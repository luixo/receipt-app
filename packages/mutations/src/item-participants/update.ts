import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];
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
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.updateItemPart(
					receiptId,
					variables.itemId,
					variables.userId,
					applyUpdate(variables.update),
					getRevert(variables.update),
				),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error updating participant(s): ${error.message}`,
	}),
};
