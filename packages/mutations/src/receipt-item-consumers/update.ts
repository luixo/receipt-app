import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";
import { mergeErrors } from "~mutations/utils";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

import { getConsumersText } from "./utils";

type Receipt = TRPCQueryOutput<"receipts.get">;
type ReceiptItem = Receipt["items"][number];
type ReceiptItemConsumer = ReceiptItem["consumers"][number];
type ReceiptPayer = Receipt["payers"][number];

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

const applyUpdatePayer =
	(
		update: TRPCMutationInput<"receiptItemConsumers.update">["update"],
	): UpdateFn<ReceiptPayer> =>
	(part) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "part":
				return { ...part, part: update.part };
		}
	};

const getRevertPayer =
	(
		update: TRPCMutationInput<"receiptItemConsumers.update">["update"],
	): SnapshotFn<ReceiptPayer> =>
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
	mutationKey: "receiptItemConsumers.update",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.updatePayer(
							receiptId,
							variables.userId,
							applyUpdatePayer(variables.update),
							getRevertPayer(variables.update),
						),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						applyUpdate(variables.update),
						getRevert(variables.update),
					),
				getPaged: undefined,
			});
		},
	errorToastOptions: (contexts) => (errors, variablesSet) => {
		const texts = getConsumersText(
			variablesSet.map(({ itemId }) => itemId),
			contexts.map((context) => context.receiptId),
		);
		return {
			text: `Error updating ${texts}: ${mergeErrors(errors)}`,
		};
	},
};
