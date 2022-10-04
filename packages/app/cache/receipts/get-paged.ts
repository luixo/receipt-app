import { hashQueryKey } from "@tanstack/react-query";

import * as utils from "app/cache/utils";
import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { removeFromArray, replaceInArray } from "app/utils/array";
import { ReceiptsId } from "next-app/src/db/models";

type Controller = utils.GenericController<"receipts.getPaged">;

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

const updatePages = (
	controller: Controller,
	updater: (page: Receipt[], count: number, input: Input) => [Receipt[], number]
) => {
	const inputsToInvalidate = utils.withRef<Input[]>(
		(ref) =>
			controller.update((input, result) => {
				const [nextItems, nextCount] = updater(
					result.items,
					result.count,
					input
				);
				let updatedItems = [...nextItems];
				if (typeof input.filters?.locked === "boolean") {
					if (input.filters.locked) {
						updatedItems = updatedItems.filter((item) => item.locked);
					} else {
						updatedItems = updatedItems.filter((item) => !item.locked);
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
							(item) => item.participantResolved === true
						);
					} else {
						updatedItems = updatedItems.filter(
							(item) => item.participantResolved === false
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
			}),
		[]
	);
	controller.invalidate(({ cursor: firstCursor, ...lookupInput }) =>
		inputsToInvalidate.some(
			({ cursor: secondCursor, ...inputToInvalidate }) =>
				hashQueryKey([inputToInvalidate]) === hashQueryKey([lookupInput])
		)
	);
};

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: (receipt: Receipt) => Receipt) =>
		utils.withRef<Receipt | undefined>((ref) =>
			updatePages(controller, (page, count) => [
				replaceInArray(
					page,
					(receipt) => receipt.id === receiptId,
					updater,
					ref
				),
				count,
			])
		);

const add = (controller: Controller, nextReceipt: Receipt) =>
	updatePages(controller, (page, count, input) => [
		[...page, nextReceipt].sort(getSortByDate(input)).slice(0, input.limit),
		count + 1,
	]);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<Receipt | undefined>((ref) =>
		updatePages(controller, (page, count) => {
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
		})
	);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getPaged");
	return {
		add: (receipt: Receipt) => add(controller, receipt),
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		remove: (receiptId: ReceiptsId) => remove(controller, receiptId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getPaged");
	return {
		add: (receipt: Receipt) =>
			utils.applyWithRevert(
				() => add(controller, receipt),
				() => remove(controller, receipt.id)
			),
		update: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<Receipt>,
			revertUpdater: utils.SnapshotFn<Receipt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(receipt) => add(controller, receipt)
			),
	};
};
