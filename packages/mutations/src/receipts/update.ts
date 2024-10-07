import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type ReceiptSnapshot = TRPCQueryOutput<"receipts.get">;

const applyUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): UpdateFn<ReceiptSnapshot> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "issued":
				return { ...item, issued: update.issued };
			case "currencyCode":
				return { ...item, currencyCode: update.currencyCode };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): SnapshotFn<ReceiptSnapshot> =>
	(snapshot) =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "currencyCode":
				return { ...receipt, currencyCode: snapshot.currencyCode };
		}
	};

export const options: UseContextedMutationOptions<"receipts.update"> = {
	onMutate: (controllerContext) => (updateObject) =>
		updateRevertReceipts(controllerContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getPaged: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error updating receipt: ${error.message}`,
	}),
};
