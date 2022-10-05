import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Controller = utils.GenericController<"receipts.get">;

type Receipt = TRPCQueryOutput<"receipts.get">;

const upsert = (controller: Controller, receipt: Receipt) =>
	controller.upsert({ id: receipt.id }, receipt);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<Receipt | undefined>((ref) => {
		controller.invalidate((input, receipt) => {
			if (input.id !== receiptId) {
				return false;
			}
			ref.current = receipt;
			return true;
		});
	}).current;

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<Receipt>) =>
		utils.withRef<Receipt | undefined>((ref) => {
			controller.update((input, receipt) => {
				if (input.id !== receiptId) {
					return;
				}
				ref.current = receipt;
				return updater(receipt);
			});
		}).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.get");
	return {
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		add: (receipt: Receipt) => upsert(controller, receipt),
		remove: (receiptId: ReceiptsId) => {
			remove(controller, receiptId);
		},
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.get");
	return {
		update: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<Receipt>,
			revertUpdater: utils.SnapshotFn<Receipt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater
			),
		add: (receipt: Receipt) =>
			utils.applyWithRevert(
				() => upsert(controller, receipt),
				() => remove(controller, receipt.id)
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => upsert(controller, snapshot)
			),
	};
};
