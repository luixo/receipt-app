import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { alwaysTrue } from "app/utils/utils";

type Controller = utils.GenericController<"account.get">;

type Account = TRPCQueryOutput<"account.get">;

const invalidateAccount = (controller: Controller) => () =>
	controller.invalidate(alwaysTrue);

const upsert = (controller: Controller, account: Account) =>
	controller.upsert(undefined, account);

const update = (controller: Controller) => (updater: utils.UpdateFn<Account>) =>
	utils.withRef<Account | undefined>((ref) => {
		controller.update((_input, account) => {
			ref.current = account;
			return updater(account);
		});
	});

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "account.get");
	return {
		update: (updater: utils.UpdateFn<Account>) => update(controller)(updater),
		upsert: (account: Account) => upsert(controller, account),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "account.get");
	return {
		update: (
			updater: utils.UpdateFn<Account>,
			revertUpdater: utils.SnapshotFn<Account>
		) =>
			utils.applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (account: Account) =>
			utils.applyWithRevert(
				() => upsert(controller, account),
				() => invalidateAccount(controller)
			),
	};
};
