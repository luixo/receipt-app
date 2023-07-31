import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Controller = TRPCReactContext["receipts"]["getName"];

type ReceiptName = TRPCQueryOutput<"receipts.getName">;

const uspert = (
	controller: Controller,
	receiptId: ReceiptsId,
	name: ReceiptName,
) => controller.setData({ id: receiptId }, name);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<ReceiptName | undefined>((ref) => {
		ref.current = controller.getData({ id: receiptId });
		controller.invalidate({ id: receiptId });
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getName;
	return {
		upsert: (receiptId: ReceiptsId, name: ReceiptName) =>
			uspert(controller, receiptId, name),
		remove: (receiptId: ReceiptsId) => remove(controller, receiptId),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getName;
	return {
		upsert: (receiptId: ReceiptsId, name: ReceiptName) =>
			utils.applyWithRevert(
				() => uspert(controller, receiptId, name),
				() => remove(controller, receiptId),
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => uspert(controller, receiptId, snapshot),
			),
	};
};
