import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Controller = utils.GenericController<"receipts.getName">;

type ReceiptName = TRPCQueryOutput<"receipts.getName">;

const uspert = (
	controller: Controller,
	receiptId: ReceiptsId,
	name: ReceiptName
) => controller.upsert({ id: receiptId }, name);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<ReceiptName | undefined>((ref) => {
		controller.invalidate((input, receipt) => {
			if (input.id !== receiptId) {
				return false;
			}
			ref.current = receipt;
			return true;
		});
	});

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getName");
	return {
		upsert: (receiptId: ReceiptsId, name: ReceiptName) =>
			uspert(controller, receiptId, name),
		remove: (receiptId: ReceiptsId) => remove(controller, receiptId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getName");
	return {
		upsert: (receiptId: ReceiptsId, name: ReceiptName) =>
			utils.applyWithRevert(
				() => uspert(controller, receiptId, name),
				() => remove(controller, receiptId)
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => uspert(controller, receiptId, snapshot)
			),
	};
};
