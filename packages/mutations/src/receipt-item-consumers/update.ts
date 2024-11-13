import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];
type ReceiptItemConsumer = ReceiptItem["consumers"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptItemConsumers.update">["update"],
	): UpdateFn<ReceiptItemConsumer> =>
	(consumer) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "part":
				return { ...consumer, part: update.part };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receiptItemConsumers.update">["update"],
	): SnapshotFn<ReceiptItemConsumer> =>
	(snapshot) =>
	(item) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "part":
				return { ...item, part: snapshot.part };
		}
	};

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.update",
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						applyUpdate(variables.update),
						getRevert(variables.update),
					),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error updating consumer(s): ${error.message}`,
	}),
};
