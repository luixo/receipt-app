import { identity } from "remeda";

import type { TRPCQueryInput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";
import { addToArray } from "~utils/array";

import type { ControllerContext, ControllerWith } from "../../types";
import { applyWithRevert, getAllInputs, withRef } from "../utils";

const id = identity();

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["receipts"]["getPaged"];
}>;

type Input = TRPCQueryInput<"receipts.getPaged">;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"receipts.getPaged">(
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
	receiptId: ReceiptsId,
	index: number,
) =>
	queryClient.setQueryData(procedure.queryKey(input), (result) => {
		if (!result) {
			return;
		}
		return {
			...result,
			items: addToArray(result.items, receiptId, index),
		};
	});

const remove = (
	{ queryClient, procedure }: Controller,
	receiptId: ReceiptsId,
) =>
	withRef<
		| {
				receiptId: ReceiptsId;
				input: Input;
				index: number;
		  }
		| undefined,
		() => void
	>((ref) => () => {
		const inputs = getAllInputs<"receipts.getPaged">(
			queryClient,
			procedure.queryKey(),
		);
		return inputs.map((input) =>
			queryClient.setQueryData(procedure.queryKey(input), (result) => {
				if (!result) {
					return;
				}
				const removedIndex = result.items.indexOf(receiptId);
				if (removedIndex === -1) {
					return;
				}
				ref.current = {
					input,
					receiptId,
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
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		remove: (receiptId: ReceiptsId) =>
			applyWithRevert(
				() => remove(controller, receiptId),
				({ current: snapshot }) => {
					if (snapshot) {
						return add(
							controller,
							snapshot.input,
							snapshot.receiptId,
							snapshot.index,
						);
					}
					return id;
				},
				({ returnValue: invalidatePages }) => invalidatePages(),
			),
	};
};
