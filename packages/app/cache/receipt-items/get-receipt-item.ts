import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

type Controller = utils.GenericController<"receiptItems.get">;

type ReceiptItemsResult = TRPCQueryOutput<"receiptItems.get">;
type ReceiptItem = ReceiptItemsResult["items"][number];

const updateReceiptItems = (
	controller: Controller,
	receiptId: ReceiptsId,
	updater: utils.UpdateFn<ReceiptItem[]>,
) =>
	controller.update((input, prevData) => {
		if (input.receiptId !== receiptId) {
			return;
		}
		const nextItems = updater(prevData.items);
		if (nextItems === prevData.items) {
			return prevData;
		}
		return { ...prevData, items: nextItems };
	});

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	item: ReceiptItem,
	index = 0,
) =>
	updateReceiptItems(controller, receiptId, (items) =>
		addToArray(items, item, index),
	);

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	receiptItemId: ReceiptItemsId,
) =>
	utils.withRef<ItemWithIndex<ReceiptItem> | undefined>((ref) =>
		updateReceiptItems(controller, receiptId, (items) =>
			removeFromArray(items, (item) => item.id === receiptItemId, ref),
		),
	).current;

const update =
	(controller: Controller, receiptId: ReceiptsId, id: ReceiptItemsId) =>
	(updater: utils.UpdateFn<ReceiptItem>) =>
		utils.withRef<ReceiptItem | undefined>((ref) =>
			updateReceiptItems(controller, receiptId, (items) =>
				replaceInArray(items, (item) => item.id === id, updater, ref),
			),
		).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receiptItems.get");
	return {
		update: (
			receiptId: ReceiptsId,
			id: ReceiptItemsId,
			updater: utils.UpdateFn<ReceiptItem>,
		) => update(controller, receiptId, id)(updater),
		add: (receiptId: ReceiptsId, item: ReceiptItem, index = 0) =>
			add(controller, receiptId, item, index),
		remove: (receiptId: ReceiptsId, receiptItemId: ReceiptItemsId) => {
			remove(controller, receiptId, receiptItemId);
		},
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receiptItems.get");
	return {
		update: (
			receiptId: ReceiptsId,
			id: ReceiptItemsId,
			updater: utils.UpdateFn<ReceiptItem>,
			revertUpdater: utils.SnapshotFn<ReceiptItem>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId, id),
				updater,
				revertUpdater,
			),
		add: (receiptId: ReceiptsId, item: ReceiptItem, index = 0) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, item, index),
				() => remove(controller, receiptId, item.id),
			),
		remove: (receiptId: ReceiptsId, receiptItemId: ReceiptItemsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, receiptItemId),
				({ item, index }) => add(controller, receiptId, item, index),
			),
	};
};
