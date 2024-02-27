import * as utils from "~app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "~app/trpc";

type Controller = TRPCReactContext["accountSettings"]["get"];

type AccountSettings = TRPCQueryOutput<"accountSettings.get">;

const invalidateAccountSettings = (controller: Controller) => () =>
	controller.invalidate();

const upsert = (controller: Controller, accountSettings: AccountSettings) =>
	controller.setData(undefined, accountSettings);

const update =
	(controller: Controller) => (updater: utils.UpdateFn<AccountSettings>) =>
		utils.withRef<AccountSettings | undefined>((ref) => {
			controller.setData(undefined, (accountSettings) => {
				if (!accountSettings) {
					return;
				}
				ref.current = accountSettings;
				return updater(accountSettings);
			});
		}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.accountSettings.get;
	return {
		update: (updater: utils.UpdateFn<AccountSettings>) =>
			update(controller)(updater),
		upsert: (account: AccountSettings) => upsert(controller, account),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.accountSettings.get;
	return {
		update: (
			updater: utils.UpdateFn<AccountSettings>,
			revertUpdater: utils.SnapshotFn<AccountSettings>,
		) =>
			utils.applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (accountSettings: AccountSettings) =>
			utils.applyWithRevert(
				() => upsert(controller, accountSettings),
				() => invalidateAccountSettings(controller),
			),
	};
};
