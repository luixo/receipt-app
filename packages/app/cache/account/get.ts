import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Controller = TRPCReactContext["account"]["get"];

type Account = TRPCQueryOutput<"account.get">;

const invalidateAccount = (controller: Controller) => () =>
	controller.invalidate();

const upsert = (controller: Controller, account: Account) =>
	controller.setData(undefined, account);

const update = (controller: Controller) => (updater: utils.UpdateFn<Account>) =>
	utils.withRef<Account | undefined>((ref) => {
		controller.setData(undefined, (account) => {
			if (!account) {
				return;
			}
			ref.current = account;
			return updater(account);
		});
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.account.get;
	return {
		update: (updater: utils.UpdateFn<Account>) => update(controller)(updater),
		upsert: (account: Account) => upsert(controller, account),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.account.get;
	return {
		update: (
			updater: utils.UpdateFn<Account>,
			revertUpdater: utils.SnapshotFn<Account>,
		) =>
			utils.applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (account: Account) =>
			utils.applyWithRevert(
				() => upsert(controller, account),
				() => invalidateAccount(controller),
			),
	};
};
