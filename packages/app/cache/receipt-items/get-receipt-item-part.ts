import * as utils from "app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import type { ItemWithIndex } from "app/utils/array";
import { addToArray, removeFromArray, replaceInArray } from "app/utils/array";
import { alwaysTrue } from "app/utils/utils";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";

type Controller = TRPCReactContext["receiptItems"]["get"];

type ReceiptItemsResult = TRPCQueryOutput<"receiptItems.get">;
type ReceiptItem = ReceiptItemsResult["items"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

type PartsUpdateFn = (
	itemParts: ReceiptItemPart[],
	item: ReceiptItem,
) => ReceiptItemPart[];

const updateParts = (
	controller: Controller,
	receiptId: ReceiptsId,
	predicate: (item: ReceiptItem) => boolean,
	updater: PartsUpdateFn,
) =>
	controller.setData({ receiptId }, (data) => {
		if (!data) {
			return;
		}
		const nextItems = replaceInArray(data.items, predicate, (item) => {
			const nextParts = updater(item.parts, item);
			if (nextParts === item.parts) {
				return item;
			}
			return { ...item, parts: nextParts };
		});
		if (data.items === nextItems) {
			return data;
		}
		return { ...data, items: nextItems };
	});

const updatePartsByItemId = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	updater: PartsUpdateFn,
) => updateParts(controller, receiptId, (item) => item.id === itemId, updater);

const updateAllParts = (
	controller: Controller,
	receiptId: ReceiptsId,
	updater: PartsUpdateFn,
) => updateParts(controller, receiptId, alwaysTrue, updater);

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	itemPart: ReceiptItemPart,
	index = 0,
) =>
	updatePartsByItemId(controller, receiptId, itemId, (parts) =>
		addToArray(parts, itemPart, index),
	);

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	userId: UsersId,
) =>
	utils.withRef<ItemWithIndex<ReceiptItemPart> | undefined>((ref) =>
		updatePartsByItemId(controller, receiptId, itemId, (parts) =>
			removeFromArray(parts, (part) => part.userId === userId, ref),
		),
	).current;

const removeByUser = (
	controller: Controller,
	receiptId: ReceiptsId,
	userId: UsersId,
) =>
	utils.withRef<
		(ItemWithIndex<ReceiptItemPart> & { itemId: ReceiptItemsId })[]
	>(
		(ref) =>
			updateAllParts(controller, receiptId, (parts, item) =>
				removeFromArray(parts, (part, index) => {
					const matched = part.userId === userId;
					if (!matched) {
						return false;
					}
					ref.current.push({
						item: part,
						index,
						itemId: item.id,
					});
					return true;
				}),
			),
		[],
	).current;

const update =
	(
		controller: Controller,
		receiptId: ReceiptsId,
		itemId: ReceiptItemsId,
		userId: UsersId,
	) =>
	(updater: utils.UpdateFn<ReceiptItemPart>) =>
		utils.withRef<ReceiptItemPart | undefined>((ref) =>
			updatePartsByItemId(controller, receiptId, itemId, (parts) =>
				replaceInArray(parts, (part) => part.userId === userId, updater, ref),
			),
		).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receiptItems.get;
	return {
		update: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptItemPart>,
		) => update(controller, receiptId, itemId, userId)(updater),
		add: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			itemPart: ReceiptItemPart,
			index = 0,
		) => add(controller, receiptId, itemId, itemPart, index),
		remove: (receiptId: ReceiptsId, itemId: ReceiptItemsId, userId: UsersId) =>
			remove(controller, receiptId, itemId, userId),
		removeByUser: (receiptId: ReceiptsId, userId: UsersId) =>
			removeByUser(controller, receiptId, userId),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receiptItems.get;
	return {
		update: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptItemPart>,
			revertUpdater: utils.SnapshotFn<ReceiptItemPart>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId, itemId, userId),
				updater,
				revertUpdater,
			),
		add: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			itemPart: ReceiptItemPart,
			index = 0,
		) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, itemId, itemPart, index),
				() => remove(controller, receiptId, itemId, itemPart.userId),
			),
		remove: (receiptId: ReceiptsId, itemId: ReceiptItemsId, userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, itemId, userId),
				({ item: part, index }) =>
					add(controller, receiptId, itemId, part, index),
			),
		removeByUser: (receiptId: ReceiptsId, userId: UsersId) =>
			utils.applyWithRevert(
				() => removeByUser(controller, receiptId, userId),
				(snapshots) =>
					snapshots.forEach(({ itemId, item: part, index }) =>
						add(controller, receiptId, itemId, part, index),
					),
			),
	};
};
