import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReact,
	TRPCReactUtils,
} from "~app/trpc";
import type { UsersId } from "~db";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getAllInputs,
	withRef,
} from "../utils";

type Controller = TRPCReactUtils["users"]["getForeign"];

type Input = TRPCQueryInput<"users.getForeign">;

type User = TRPCQueryOutput<"users.getForeign">;
type OwnUser = Exclude<
	TRPCQueryOutput<"users.getForeign">,
	{ remoteId: string }
>;

const getInputs = (trpc: TRPCReact, queryClient: QueryClient) =>
	getAllInputs<"users.getForeign">(
		queryClient,
		getQueryKey(trpc.users.getForeign),
	);

const update =
	(controller: Controller, userId: UsersId) => (updater: UpdateFn<User>) =>
		withRef<User | undefined>((ref) => {
			controller.setData({ id: userId }, (user) => {
				if (!user) {
					return;
				}
				ref.current = user;
				return updater(user);
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

const removeOwn = (controller: Controller, userId: UsersId) =>
	withRef<OwnUser | undefined>((ref) => {
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
	trpc,
}: ControllerContext) => {
	const controller = trpcContext.users.getForeign;
	const inputs = getInputs(trpc, queryClient);
	return {
		updateOwn: (userId: UsersId, updater: UpdateFn<OwnUser>) =>
			updateOwn(controller, userId)(updater),
		invalidateForeign: () => invalidateForeign(controller, inputs),
	};
};

export const getRevertController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.users.getForeign;
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
