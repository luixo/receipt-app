import type { QueryClient } from "@tanstack/react-query";
import { hashQueryKey } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import * as utils from "app/cache/utils";
import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { trpc } from "app/trpc";
import { removeFromArray, replaceInArray } from "app/utils/array";
import { id } from "app/utils/utils";
import type { ReceiptsId } from "next-app/src/db/models";

type Controller = TRPCReactContext["receipts"]["getPaged"];

type ReceiptPage = TRPCQueryOutput<"receipts.getPaged">;
type Receipt = ReceiptPage["items"][number];
type Input = TRPCQueryInput<"receipts.getPaged">;

const getSortByDate = (input: Input) => (a: Receipt, b: Receipt) => {
	switch (input.orderBy) {
		case "date-asc":
			return a.issued.valueOf() - b.issued.valueOf();
		case "date-desc":
			return b.issued.valueOf() - a.issued.valueOf();
	}
};

const getPagedInputs = (queryClient: QueryClient) =>
	utils.getAllInputs<"receipts.getPaged">(
		queryClient,
		getQueryKey(trpc.receipts.getPaged),
	);

const updatePages = (
	controller: Controller,
	inputs: Input[],
	updater: (
		page: Receipt[],
		count: number,
		input: Input,
	) => [Receipt[], number],
) => {
	const inputsToInvalidate = utils.withRef<Input[]>((ref) => {
		inputs.forEach((input) => {
			controller.setData(input, (result) => {
				if (!result) {
					return;
				}
				const [nextItems, nextCount] = updater(
					result.items,
					result.count,
					input,
				);
				let updatedItems = [...nextItems];
				if (typeof input.filters?.locked === "boolean") {
					if (input.filters.locked) {
						updatedItems = updatedItems.filter((item) =>
							Boolean(item.lockedTimestamp),
						);
					} else {
						updatedItems = updatedItems.filter((item) => !item.lockedTimestamp);
					}
				}
				if (typeof input.filters?.ownedByMe === "boolean") {
					if (input.filters.ownedByMe) {
						updatedItems = updatedItems.filter((item) => item.role === "owner");
					} else {
						updatedItems = updatedItems.filter((item) => item.role !== "owner");
					}
				}
				if (typeof input.filters?.resolvedByMe === "boolean") {
					if (input.filters.resolvedByMe) {
						updatedItems = updatedItems.filter(
							(item) => item.participantResolved === true,
						);
					} else {
						updatedItems = updatedItems.filter(
							(item) => item.participantResolved === false,
						);
					}
				}
				let updatedCount = nextCount;
				if (updatedItems.length !== nextItems.length) {
					updatedCount -= nextItems.length - updatedItems.length;
				}
				if (updatedCount !== result.count) {
					ref.current.push(input);
				}
				if (nextItems === result.items && updatedCount === result.count) {
					return result;
				}
				return { ...result, items: updatedItems, count: updatedCount };
			});
		});
	}, []).current;
	return () => {
		inputs
			.filter(({ cursor: _, ...lookupInput }) =>
				inputsToInvalidate.some(
					({ cursor: __, ...inputToInvalidate }) =>
						hashQueryKey([inputToInvalidate]) === hashQueryKey([lookupInput]),
				),
			)
			.forEach((input) => {
				const page = controller.getData(input);
				if (!page) {
					return;
				}
				controller.invalidate(input);
			});
	};
};

const update =
	(controller: Controller, inputs: Input[], receiptId: ReceiptsId) =>
	(updater: (receipt: Receipt) => Receipt) =>
		utils.withRef<Receipt | undefined, () => void>((ref) =>
			updatePages(controller, inputs, (page, count) => [
				replaceInArray(
					page,
					(receipt) => receipt.id === receiptId,
					updater,
					ref,
				),
				count,
			]),
		);

const add = (controller: Controller, inputs: Input[], nextReceipt: Receipt) =>
	updatePages(controller, inputs, (page, count, input) => [
		[...page, nextReceipt].sort(getSortByDate(input)).slice(0, input.limit),
		count + 1,
	]);

const remove = (
	controller: Controller,
	inputs: Input[],
	receiptId: ReceiptsId,
) =>
	utils.withRef<Receipt | undefined, () => void>((ref) =>
		updatePages(controller, inputs, (page, count) => {
			const nextPage = removeFromArray(page, (receipt) => {
				const match = receipt.id === receiptId;
				if (!match) {
					return false;
				}
				ref.current = receipt;
				return true;
			});
			if (nextPage.length === page.length) {
				return [page, count];
			}
			return [nextPage, count - 1];
		}),
	);

export const getController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		add: (receipt: Receipt) => add(controller, inputs, receipt),
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, inputs, receiptId)(updater),
		remove: (receiptId: ReceiptsId) => remove(controller, inputs, receiptId),
	};
};

export const getRevertController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getPaged;
	const inputs = getPagedInputs(queryClient);
	return {
		add: (receipt: Receipt) =>
			utils.applyWithRevert(
				() => add(controller, inputs, receipt),
				() => remove(controller, inputs, receipt.id),
				(invalidatePages) => invalidatePages(),
			),
		update: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<Receipt>,
			revertUpdater: utils.SnapshotFn<Receipt>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, inputs, receiptId),
				updater,
				({ current }) => {
					if (current) {
						return revertUpdater(current);
					}
					return id;
				},
				({ returnValue: invalidatePages }) => invalidatePages(),
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, inputs, receiptId),
				({ current: receipt }) => {
					if (receipt) {
						return add(controller, inputs, receipt);
					}
					return id;
				},
				({ returnValue: invalidatePages }) => invalidatePages(),
			),
	};
};
