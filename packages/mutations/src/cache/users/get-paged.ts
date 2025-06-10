import { identity } from "remeda";

import type { TRPCQueryInput } from "~app/trpc";
import type { UsersId } from "~db/models";
import { addToArray } from "~utils/array";

import type { ControllerContext, ControllerWith } from "../../types";
import { applyWithRevert, getAllInputs, withRef } from "../utils";

const id = identity();

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["users"]["getPaged"];
}>;

type Input = TRPCQueryInput<"users.getPaged">;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"users.getPaged">(
		queryClient,
		procedure.queryKey(),
	);
	return inputs.map((input) =>
		queryClient.invalidateQueries(procedure.queryFilter(input)),
	);
};

const add = (
	{ queryClient, procedure }: Controller,
	input: Input,
	userId: UsersId,
	index: number,
) =>
	queryClient.setQueryData(procedure.queryKey(input), (result) => {
		if (!result) {
			return;
		}
		return {
			...result,
			items: addToArray(result.items, userId, index),
		};
	});

const remove = ({ queryClient, procedure }: Controller, userId: UsersId) =>
	withRef<
		| {
				userId: UsersId;
				input: Input;
				index: number;
		  }
		| undefined,
		() => void
	>((ref) => () => {
		const inputs = getAllInputs<"users.getPaged">(
			queryClient,
			procedure.queryKey(),
		);
		return inputs.map((input) =>
			queryClient.setQueryData(procedure.queryKey(input), (result) => {
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
		);
	});

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		remove: (userId: UsersId) =>
			applyWithRevert(
				() => remove(controller, userId),
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
