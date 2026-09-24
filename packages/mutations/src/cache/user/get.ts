import type { User } from "~app/trpc-types";

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
	procedure: ControllerContext["trpc"]["user"]["get"];
}>;

const invalidateUser =
	({ queryClient, procedure }: Controller) =>
	() =>
		queryClient.invalidateQueries(procedure.queryFilter());

const upsert = ({ queryClient, procedure }: Controller, user: User) =>
	queryClient.setQueryData(procedure.queryKey(), user);

const update =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<User>) =>
		withRef<User | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey(), (user) => {
				ref.current = user;
				return getUpdatedData(user, updater);
			});
		}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.user.get };
	return {
		update: (updater: UpdateFn<User>) => update(controller)(updater),
		upsert: (user: User) => upsert(controller, user),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.user.get };
	return {
		update: (updater: UpdateFn<User>, revertUpdater: SnapshotFn<User>) =>
			applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (user: User) =>
			applyWithRevert(
				() => upsert(controller, user),
				() => {
					invalidateUser(controller);
				},
			),
	};
};
