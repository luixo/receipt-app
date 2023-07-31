import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Controller = TRPCReactContext["receipts"]["getNonResolvedAmount"];

type Amount = TRPCQueryOutput<"receipts.getNonResolvedAmount">;

const update = (controller: Controller) => (updater: utils.UpdateFn<Amount>) =>
	utils.withRef<Amount | undefined>((ref) => {
		ref.current = controller.getData();
		controller.setData(undefined, (amount) =>
			amount === undefined ? undefined : updater(amount),
		);
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getNonResolvedAmount;
	return {
		update: (updater: utils.UpdateFn<Amount>) => update(controller)(updater),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getNonResolvedAmount;
	return {
		update: (
			updater: utils.UpdateFn<Amount>,
			revertUpdater: utils.SnapshotFn<Amount>,
		) =>
			utils.applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
	};
};
