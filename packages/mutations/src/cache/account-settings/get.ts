import type { TRPCQueryOutput, TRPCReactContext } from "~app/trpc";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = TRPCReactContext["accountSettings"]["get"];

type AccountSettings = TRPCQueryOutput<"accountSettings.get">;

const invalidateAccountSettings = (controller: Controller) => () =>
	controller.invalidate();

const upsert = (controller: Controller, accountSettings: AccountSettings) =>
	controller.setData(undefined, accountSettings);

const update =
	(controller: Controller) => (updater: UpdateFn<AccountSettings>) =>
		withRef<AccountSettings | undefined>((ref) => {
			controller.setData(undefined, (accountSettings) => {
				if (!accountSettings) {
					return;
				}
				ref.current = accountSettings;
				return updater(accountSettings);
			});
		}).current;

export const getController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.accountSettings.get;
	return {
		update: (updater: UpdateFn<AccountSettings>) => update(controller)(updater),
		upsert: (account: AccountSettings) => upsert(controller, account),
	};
};

export const getRevertController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.accountSettings.get;
	return {
		update: (
			updater: UpdateFn<AccountSettings>,
			revertUpdater: SnapshotFn<AccountSettings>,
		) => applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (accountSettings: AccountSettings) =>
			applyWithRevert(
				() => upsert(controller, accountSettings),
				() => invalidateAccountSettings(controller),
			),
	};
};
