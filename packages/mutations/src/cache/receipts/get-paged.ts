import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import type { TRPCQueryInput, TRPCReact, TRPCReactUtils } from "~app/trpc";
import type { ReceiptsId } from "~db";
import { addToArray, id } from "~utils";

import type { ControllerContext } from "../../types";
import { applyWithRevert, getAllInputs, withRef } from "../utils";

type Controller = TRPCReactUtils["receipts"]["getPaged"];

type Input = TRPCQueryInput<"receipts.getPaged">;

const getPagedInputs = (trpc: TRPCReact, queryClient: QueryClient) =>
	getAllInputs<"receipts.getPaged">(
		queryClient,
		getQueryKey(trpc.receipts.getPaged),
	);

const invalidate = (controller: Controller, inputs: Input[]) =>
	inputs.map((input) => controller.invalidate(input));

const add = (
	controller: Controller,
	input: Input,
	receiptId: ReceiptsId,
	index: number,
) =>
	controller.setData(input, (result) => {
		if (!result) {
			return;
		}
		return {
			...result,
			items: addToArray(result.items, receiptId, index),
		};
	});

const remove = (
	controller: Controller,
	inputs: Input[],
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
	>(
		(ref) => () =>
			inputs.map((input) =>
				controller.setData(input, (result) => {
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
			),
	);

export const getController = ({
	trpcContext,
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = trpcContext.receipts.getPaged;
	const inputs = getPagedInputs(trpc, queryClient);
	return {
		invalidate: () => invalidate(controller, inputs),
	};
};

export const getRevertController = ({
	trpcContext,
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = trpcContext.receipts.getPaged;
	const inputs = getPagedInputs(trpc, queryClient);
	return {
		remove: (receiptId: ReceiptsId) =>
			applyWithRevert(
				() => remove(controller, inputs, receiptId),
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
