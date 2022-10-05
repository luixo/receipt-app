import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Controller = utils.GenericController<"receipts.getNonResolvedAmount">;

type Amount = TRPCQueryOutput<"receipts.getNonResolvedAmount">;

const update = (controller: Controller) => (updater: utils.UpdateFn<Amount>) =>
	utils.withRef<Amount | undefined>((ref) => {
		controller.update((_input, amount) => {
			ref.current = amount;
			return updater(amount);
		});
	}).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"receipts.getNonResolvedAmount"
	);
	return {
		update: (updater: utils.UpdateFn<Amount>) => update(controller)(updater),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"receipts.getNonResolvedAmount"
	);
	return {
		update: (
			updater: utils.UpdateFn<Amount>,
			revertUpdater: utils.SnapshotFn<Amount>
		) =>
			utils.applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
	};
};
