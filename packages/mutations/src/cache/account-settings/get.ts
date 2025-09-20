import type { TRPCQueryOutput } from "~app/trpc";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["accountSettings"]["get"];
}>;

type AccountSettings = TRPCQueryOutput<"accountSettings.get">;

const invalidateAccountSettings =
	({ queryClient, procedure }: Controller) =>
	() =>
		queryClient.invalidateQueries(procedure.queryFilter());

const upsert = (
	{ queryClient, procedure }: Controller,
	accountSettings: AccountSettings,
) => queryClient.setQueryData(procedure.queryKey(), accountSettings);

const update =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<AccountSettings>) =>
		withRef<AccountSettings | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey(), (accountSettings) => {
				ref.current = accountSettings;
				return getUpdatedData(accountSettings, updater);
			});
		}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.accountSettings.get };
	return {
		update: (updater: UpdateFn<AccountSettings>) => update(controller)(updater),
		upsert: (account: AccountSettings) => upsert(controller, account),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.accountSettings.get };
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
