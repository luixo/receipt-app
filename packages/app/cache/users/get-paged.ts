import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import * as utils from "~app/cache/utils";
import type { TRPCQueryInput, TRPCReactContext } from "~app/trpc";
import { trpc } from "~app/trpc";
import { addToArray } from "~app/utils/array";
import { id } from "~app/utils/utils";
import type { UsersId } from "~web/db/models";

type Controller = TRPCReactContext["users"]["getPaged"];

type Input = TRPCQueryInput<"users.getPaged">;

const getPagedInputs = (queryClient: QueryClient) =>
	utils.getAllInputs<"users.getPaged">(
		queryClient,
		getQueryKey(trpc.users.getPaged),
	);

const invalidate = (controller: Controller, inputs: Input[]) =>
	inputs.map((input) => controller.invalidate(input));

const add = (
	controller: Controller,
	input: Input,
	userId: UsersId,
	index: number,
) =>
	controller.setData(input, (result) => {
		if (!result) {
			return;
		}
		return {
			...result,
			items: addToArray(result.items, userId, index),
		};
	});

const remove = (controller: Controller, inputs: Input[], userId: UsersId) =>
	utils.withRef<
		| {
				userId: UsersId;
				input: Input;
				index: number;
		  }
		| undefined,
		() => void
	>(
		(ref) => () =>
			inputs.map((input) =>
				controller.setData(input, (result) => {
					if (!result) {
						return;
					}
					const removedIndex = result.items.indexOf(userId);
					if (removedIndex === -1) {
						return;
					}
					if (ref) {
						ref.current = {
							input,
							userId,
							index: removedIndex,
						};
					}
					return {
						...result,
						items: [
							...result.items.slice(0, removedIndex),
							...result.items.slice(removedIndex + 1),
						],
					};
				}),
			),
	);

export const getController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		invalidate: () => invalidate(controller, inputs),
	};
};

export const getRevertController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, inputs, userId),
				({ current: snapshot }) => {
					if (snapshot) {
						return add(
							controller,
							snapshot.input,
							snapshot.userId,
							snapshot.index,
						);
					}
					return id;
				},
				({ returnValue: invalidatePages }) => invalidatePages(),
			),
	};
};
