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
	getAllInputs,
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["users"]["getForeign"];
}>;

type User = TRPCQueryOutput<"users.getForeign">;
type OwnUser = Exclude<
	TRPCQueryOutput<"users.getForeign">,
	{ remoteId: string }
>;

const update =
	({ queryClient, procedure }: Controller, userId: UsersId) =>
	(updater: UpdateFn<User>) =>
		withRef<User | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ id: userId }), (user) => {
				ref.current = user;
				return getUpdatedData(user, updater);
			});
		}).current;

const updateOwn =
	(controller: Controller, userId: UsersId) => (updater: UpdateFn<OwnUser>) =>
		update(
			controller,
			userId,
		)((user) => {
			if ("remoteId" in user) {
				return user;
			}
			return updater(user);
		}) as OwnUser | undefined;

const removeOwn = ({ queryClient, procedure }: Controller, userId: UsersId) =>
	withRef<OwnUser | undefined>((ref) => {
		const currentUser = queryClient.getQueryData(
			procedure.queryKey({ id: userId }),
		);
		if (currentUser && "remoteId" in currentUser) {
			return;
		}
		ref.current = currentUser;
		return queryClient.invalidateQueries(procedure.queryFilter({ id: userId }));
	}).current;

const addOwn = ({ queryClient, procedure }: Controller, user: OwnUser) =>
	queryClient.setQueryData(procedure.queryKey({ id: user.id }), user);

const invalidateForeign = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"users.getForeign">(
		queryClient,
		procedure.queryKey(),
	);
	inputs.forEach((input) => {
		const currentUser = queryClient.getQueryData(procedure.queryKey(input));
		if (currentUser && "publicName" in currentUser) {
			return;
		}
		return queryClient.invalidateQueries(procedure.queryFilter(input));
	});
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getForeign };
	return {
		updateOwn: (userId: UsersId, updater: UpdateFn<OwnUser>) =>
			updateOwn(controller, userId)(updater),
		invalidateForeign: () => invalidateForeign(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getForeign };
	return {
		updateOwn: (
			userId: UsersId,
			updater: UpdateFn<OwnUser>,
			revertUpdater: SnapshotFn<OwnUser>,
		) =>
			applyUpdateFnWithRevert(
				updateOwn(controller, userId),
				updater,
				revertUpdater,
			),
		removeOwn: (userId: UsersId) =>
			applyWithRevert(
				() => removeOwn(controller, userId),
				(snapshot) => addOwn(controller, snapshot),
			),
	};
};
