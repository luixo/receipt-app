import * as utils from "app/cache/utils";
import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { alwaysTrue } from "app/utils/utils";
import { ReceiptsId } from "next-app/src/db/models";

type Controller = utils.GenericController<"receipts.getPaged">;

type ReceiptPage = TRPCQueryOutput<"receipts.getPaged">;
type Receipt = ReceiptPage["items"][number];
type Input = TRPCQueryInput<"receipts.getPaged">;

type InputPredicate = (input: Input) => boolean;

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
) =>
	controller.update((input, result) => {
		const [nextItems, nextCount] = updater(result.items, result.count, input);
		if (nextItems === result.items && nextCount === result.count) {
			return result;
		}
		return { ...result, items: nextItems, count: nextCount };
	});

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

const add = (
	controller: Controller,
	nextReceipt: Receipt,
	predicate: InputPredicate = alwaysTrue
) =>
	utils.withRef<number | undefined>((ref) =>
		updatePages(controller, (page, count, input) => {
			if (!predicate(input)) {
				return [page, count];
			}
			if (ref.current !== undefined) {
				return [page, count + 1];
			}
			const sortedPage = [...page, nextReceipt].sort(getSortByDate(input));
			const sortedIndex = sortedPage.indexOf(nextReceipt);
			if (sortedIndex === 0) {
				if (input.cursor === 0) {
					// We have an item in the beginning of the first page
					// We can trust it is it's actual location
					ref.current = input.cursor;
					return [sortedPage, count + 1];
				}
				// The beginning of the page - probably should fit on the previous page
				return [page, count];
			}
			if (sortedIndex === sortedPage.length - 1) {
				// The end of the page - probably should fit on the next page
				return [page, count];
			}
			ref.current = input.cursor;
			return [sortedPage.slice(0, input.limit), count + 1];
		})
	);

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	predicate: InputPredicate = alwaysTrue
) => {
	const cursorRef = utils.createRef<number>(-1);
	const removedItem = utils.withRef<ItemWithIndex<Receipt> | undefined>((ref) =>
		updatePages(controller, (page, count, input) => {
			if (!predicate(input)) {
				return [page, count];
			}
			if (ref.current) {
				return [page, count - 1];
			}
			const nextPage = removeFromArray(
				page,
				(receipt) => {
					const match = receipt.id === receiptId;
					if (!match) {
						return false;
					}
					cursorRef.current = input.cursor;
					return true;
				},
				ref
			);
			if (nextPage.length === page.length) {
				return [page, count];
			}
			return [nextPage, count - 1];
		})
	);
	if (removedItem) {
		return {
			...removedItem,
			cursor: cursorRef.current,
		};
	}
};

const invalidate = (
	controller: Controller,
	sinceCursor: number = 0,
	predicate: InputPredicate = alwaysTrue
) =>
	utils.withRef<ReceiptPage[]>(
		(ref) =>
			controller.invalidate(
				(input, page) => {
					if (!predicate(input)) {
						return false;
					}
					const match = input.cursor >= sinceCursor;
					if (!match) {
						return false;
					}
					ref.current.push(page);
					return true;
				},
				{ refetchType: "all" }
			),
		[]
	);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getPaged");
	return {
		add: (receipt: Receipt, predicate?: InputPredicate) =>
			add(controller, receipt, predicate),
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		remove: (receiptId: ReceiptsId, predicate?: InputPredicate) =>
			remove(controller, receiptId, predicate),
		invalidate: (sinceCursor?: number, predicate?: InputPredicate) =>
			invalidate(controller, sinceCursor, predicate),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receipts.getPaged");
	return {
		add: (receipt: Receipt, predicate?: InputPredicate) =>
			// TODO: add paged invalidation on adding a receipt
			utils.applyWithRevert(
				() => add(controller, receipt, predicate),
				() => remove(controller, receipt.id, predicate)
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
		remove: (receiptId: ReceiptsId, predicate?: InputPredicate) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, predicate),
				({ item }) => add(controller, item, predicate)
			),
		invalidate: (sinceCursor?: number, predicate?: InputPredicate) =>
			invalidate(controller, sinceCursor, predicate),
	};
};
