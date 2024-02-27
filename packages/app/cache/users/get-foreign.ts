import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import * as utils from "~app/cache/utils";
import { trpc } from "~app/trpc";
import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "~app/trpc";
import type { UsersId } from "~web/db/models";

type Controller = TRPCReactContext["users"]["getForeign"];

type Input = TRPCQueryInput<"users.getForeign">;

type User = TRPCQueryOutput<"users.getForeign">;
type OwnUser = Exclude<
	TRPCQueryOutput<"users.getForeign">,
	{ remoteId: string }
>;

const getInputs = (queryClient: QueryClient) =>
	utils.getAllInputs<"users.getForeign">(
		queryClient,
		getQueryKey(trpc.users.getForeign),
	);

const update =
	(controller: Controller, userId: UsersId) =>
	(updater: utils.UpdateFn<User>) =>
		utils.withRef<User | undefined>((ref) => {
			controller.setData({ id: userId }, (user) => {
				if (!user) {
					return;
				}
				ref.current = user;
				return updater(user);
			});
		}).current;

const updateOwn =
	(controller: Controller, userId: UsersId) =>
	(updater: utils.UpdateFn<OwnUser>) =>
		update(
			controller,
			userId,
		)((user) => {
			if ("remoteId" in user) {
				return user;
			}
			return updater(user);
		}) as OwnUser | undefined;

const removeOwn = (controller: Controller, userId: UsersId) =>
	utils.withRef<OwnUser | undefined>((ref) => {
		const currentUser = controller.getData({ id: userId });
		if (currentUser && "remoteId" in currentUser) {
			return;
		}
		ref.current = currentUser;
		return controller.invalidate({ id: userId });
	}).current;

const addOwn = (controller: Controller, user: OwnUser) =>
	controller.setData({ id: user.id }, user);

const invalidateForeign = (controller: Controller, inputs: Input[]) => {
	inputs.forEach((input) => {
		const currentUser = controller.getData(input);
		if (currentUser && "publicName" in currentUser) {
			return;
		}
		return controller.invalidate(input);
	});
};

export const getController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getForeign;
	const inputs = getInputs(queryClient);
	return {
		updateOwn: (userId: UsersId, updater: utils.UpdateFn<OwnUser>) =>
			updateOwn(controller, userId)(updater),
		invalidateForeign: () => invalidateForeign(controller, inputs),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getForeign;
	return {
		updateOwn: (
			userId: UsersId,
			updater: utils.UpdateFn<OwnUser>,
			revertUpdater: utils.SnapshotFn<OwnUser>,
		) =>
			utils.applyUpdateFnWithRevert(
				updateOwn(controller, userId),
				updater,
				revertUpdater,
			),
		removeOwn: (userId: UsersId) =>
			utils.applyWithRevert(
				() => removeOwn(controller, userId),
				(snapshot) => addOwn(controller, snapshot),
			),
	};
};
