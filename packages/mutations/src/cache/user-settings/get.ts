import type { UserSettings } from "~app/trpc-types";

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
	procedure: ControllerContext["trpc"]["userSettings"]["get"];
}>;

const invalidateUserSettings =
	({ queryClient, procedure }: Controller) =>
	() =>
		queryClient.invalidateQueries(procedure.queryFilter());

const upsert = (
	{ queryClient, procedure }: Controller,
	userSettings: UserSettings,
) => queryClient.setQueryData(procedure.queryKey(), userSettings);

const update =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<UserSettings>) =>
		withRef<UserSettings | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey(), (userSettings) => {
				ref.current = userSettings;
				return getUpdatedData(userSettings, updater);
			});
		}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.userSettings.get };
	return {
		update: (updater: UpdateFn<UserSettings>) => update(controller)(updater),
		upsert: (user: UserSettings) => upsert(controller, user),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.userSettings.get };
	return {
		update: (
			updater: UpdateFn<UserSettings>,
			revertUpdater: SnapshotFn<UserSettings>,
		) => applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (userSettings: UserSettings) =>
			applyWithRevert(
				() => upsert(controller, userSettings),
				() => {
					invalidateUserSettings(controller);
				},
			),
	};
};
