import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["account"]["get"];

type Account = TRPCQueryOutput<"account.get">;

const invalidateAccount = (controller: Controller) => () =>
	controller.invalidate();

const upsert = (controller: Controller, account: Account) =>
	controller.setData(undefined, account);

const update = (controller: Controller) => (updater: UpdateFn<Account>) =>
	withRef<Account | undefined>((ref) => {
		controller.setData(undefined, (account) => {
			if (!account) {
				return;
			}
			ref.current = account;
			return updater(account);
		});
	}).current;

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.account.get;
	return {
		update: (updater: UpdateFn<Account>) => update(controller)(updater),
		upsert: (account: Account) => upsert(controller, account),
	};
};

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.account.get;
	return {
		update: (updater: UpdateFn<Account>, revertUpdater: SnapshotFn<Account>) =>
			applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (account: Account) =>
			applyWithRevert(
				() => upsert(controller, account),
				() => invalidateAccount(controller),
			),
	};
};
