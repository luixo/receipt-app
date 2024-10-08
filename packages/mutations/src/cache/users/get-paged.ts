import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { identity } from "remeda";

import type { TRPCQueryInput, TRPCReact, TRPCReactUtils } from "~app/trpc";
import type { UsersId } from "~db/models";
import { addToArray } from "~utils/array";

import type { ControllerContext } from "../../types";
import { applyWithRevert, getAllInputs, withRef } from "../utils";

const id = identity();

type Controller = TRPCReactUtils["users"]["getPaged"];

type Input = TRPCQueryInput<"users.getPaged">;

const getPagedInputs = (trpc: TRPCReact, queryClient: QueryClient) =>
	getAllInputs<"users.getPaged">(queryClient, getQueryKey(trpc.users.getPaged));

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
	withRef<
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
					ref.current = {
						input,
						userId,
						index: removedIndex,
					};
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
	trpcUtils,
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = trpcUtils.users.getPaged;
	const inputs = getPagedInputs(trpc, queryClient);
	return {
		invalidate: () => invalidate(controller, inputs),
	};
};

export const getRevertController = ({
	trpcUtils,
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = trpcUtils.users.getPaged;
	const inputs = getPagedInputs(trpc, queryClient);
	return {
		remove: (userId: UsersId) =>
			applyWithRevert(
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
