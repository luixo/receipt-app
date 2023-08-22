import * as utils from "app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

type Controller = TRPCReactContext["receipts"]["get"];

type Receipt = TRPCQueryOutput<"receipts.get">;

const upsert = (controller: Controller, receipt: Receipt) =>
	controller.setData({ id: receipt.id }, receipt);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<Receipt | undefined>((ref) => {
		ref.current = controller.getData({ id: receiptId });
		controller.invalidate({ id: receiptId });
	}).current;

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<Receipt>) =>
		utils.withRef<Receipt | undefined>((ref) => {
			controller.setData({ id: receiptId }, (receipt) => {
				if (!receipt) {
					return;
				}
				ref.current = receipt;
				return updater(receipt);
			});
		}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receipts.get;
	return {
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		add: (receipt: Receipt) => upsert(controller, receipt),
		remove: (receiptId: ReceiptsId) => {
			remove(controller, receiptId);
		},
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.get;
	return {
		update: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<Receipt>,
			revertUpdater: utils.SnapshotFn<Receipt>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater,
			),
		add: (receipt: Receipt) =>
			utils.applyWithRevert(
				() => upsert(controller, receipt),
				() => remove(controller, receipt.id),
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
