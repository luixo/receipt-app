import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptId } from "~db/ids";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

import { getPayersItems } from "./utils";

type Receipt = TRPCQueryOutput<"receipts.get">;
type ReceiptItem = Receipt["items"][number];
type ReceiptItemPayer = ReceiptItem["payers"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptItemPayers.update">["update"],
	): UpdateFn<ReceiptItemPayer> =>
	(payer) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "part":
				return { ...payer, part: update.part };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receiptItemPayers.update">["update"],
	): SnapshotFn<ReceiptItemPayer> =>
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
	"receiptItemPayers.update",
	{ receiptId: ReceiptId }
> = {
	mutationKey: "receiptItemPayers.update",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemPayer(
						receiptId,
						variables.itemId,
						variables.userId,
						applyUpdate(variables.update),
						getRevert(variables.update),
					),
				getPaged: undefined,
			}),
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.updateItemPayer.error", {
				ns: "receipts",
				items: getPayersItems(
					t,
					variablesSet.map(({ itemId }) => itemId),
				),
				errors,
			}),
		}),
};
