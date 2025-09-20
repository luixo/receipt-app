import type { TRPCQueryOutput } from "~app/trpc";
import type { UsersId } from "~db/models";

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
	procedure: ControllerContext["trpc"]["users"]["get"];
}>;

type User = TRPCQueryOutput<"users.get">;

const update =
	({ queryClient, procedure }: Controller, userId: UsersId) =>
	(updater: UpdateFn<User>) =>
		withRef<User | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ id: userId }), (user) => {
				ref.current = user;
				return getUpdatedData(user, updater);
			});
		}).current;

const upsert = ({ queryClient, procedure }: Controller, user: User) =>
	queryClient.setQueryData(procedure.queryKey({ id: user.id }), user);

const remove = ({ queryClient, procedure }: Controller, userId: UsersId) =>
	withRef<User | undefined>((ref) => {
		ref.current = queryClient.getQueryData(procedure.queryKey({ id: userId }));
		return queryClient.invalidateQueries(procedure.queryFilter({ id: userId }));
	}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.get };
	return {
		update: (userId: UsersId, updater: UpdateFn<User>) =>
			update(controller, userId)(updater),
		add: (user: User) => upsert(controller, user),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.get };
	return {
		update: (
			userId: UsersId,
			updater: UpdateFn<User>,
			revertUpdater: SnapshotFn<User>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, userId),
				updater,
				revertUpdater,
			),
		add: (user: User) =>
			applyWithRevert(
				() => upsert(controller, user),
				() => remove(controller, user.id),
			),
		remove: (userId: UsersId) =>
			applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
