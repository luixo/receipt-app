import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["receipts"]["getNonResolvedAmount"];

type Amount = TRPCQueryOutput<"receipts.getNonResolvedAmount">;

const update = (controller: Controller) => (updater: UpdateFn<Amount>) =>
	withRef<Amount | undefined>((ref) => {
		ref.current = controller.getData();
		controller.setData(undefined, (amount) =>
			amount === undefined ? undefined : updater(amount),
		);
	}).current;

export const getController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.receipts.getNonResolvedAmount;
	return {
		update: (updater: UpdateFn<Amount>) => update(controller)(updater),
	};
};

export const getRevertController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.receipts.getNonResolvedAmount;
	return {
		update: (updater: UpdateFn<Amount>, revertUpdater: SnapshotFn<Amount>) =>
			applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
	};
};
