import * as utils from "app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import type { ItemWithIndex } from "app/utils/array";
import { addToArray, removeFromArray, replaceInArray } from "app/utils/array";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/db/models";

type Controller = TRPCReactContext["receipts"]["get"];

type Receipt = TRPCQueryOutput<"receipts.get">;

type ReceiptItems = Receipt["items"];
type ReceiptItem = ReceiptItems[number];
type ReceiptItemParts = ReceiptItem["parts"];
type ReceiptItemPart = ReceiptItemParts[number];

type ReceiptParticipants = Receipt["participants"];
type ReceiptParticipant = ReceiptParticipants[number];

const upsert = (controller: Controller, receipt: Receipt) =>
	controller.setData({ id: receipt.id }, receipt);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<Receipt | undefined>((ref) => {
		ref.current = controller.getData({ id: receiptId });
		return controller.invalidate({ id: receiptId });
	}).current;

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<Receipt>) =>
		utils.withRef<Receipt | undefined>((ref) => {
			controller.setData({ id: receiptId }, (receipt) => {
				if (!receipt) {
					return;
				}
				ref.current = receipt;
				return updater(receipt);
			});
		}).current;

const updateItems =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ReceiptItems>) =>
		utils.withRef<ReceiptItems | undefined>((ref) =>
			update(
				controller,
				receiptId,
			)((receipt) => {
				const nextItems = updater(receipt.items);
				if (nextItems === receipt.items) {
					return receipt;
				}
				ref.current = receipt.items;
				return { ...receipt, items: nextItems };
			}),
		).current;

const updateAllItems =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ReceiptItem>) =>
		utils.withRef<ReceiptItem[]>(
			(ref) =>
				updateItems(
					controller,
					receiptId,
				)((items) => {
					const nextItems = items.map(updater);
					const updatedItems = nextItems.filter(
						(item, index) => item !== items[index],
					);
					if (updatedItems.length === 0) {
						return items;
					}
					ref.current.push(...updatedItems);
					return { ...items, items: nextItems };
				}),
			[],
		).current;

const updateItem =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(updater: utils.UpdateFn<ReceiptItem>) =>
		utils.withRef<ReceiptItem | undefined>((ref) =>
			updateItems(
				controller,
				receiptId,
			)((items) =>
				replaceInArray(items, (item) => item.id === itemId, updater, ref),
			),
		).current;

const addItem =
	(controller: Controller, receiptId: ReceiptsId) =>
	(item: ReceiptItem, index = 0) =>
		updateItems(
			controller,
			receiptId,
		)((items) => addToArray(items, item, index));

const removeItem = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
) =>
	utils.withRef<ItemWithIndex<ReceiptItem> | undefined>((ref) =>
		updateItems(
			controller,
			receiptId,
		)((items) => removeFromArray(items, (item) => itemId === item.id, ref)),
	).current;

const updateItemParts =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(updater: utils.UpdateFn<ReceiptItemParts>) =>
		utils.withRef<ReceiptItemParts | undefined>((ref) =>
			updateItem(
				controller,
				receiptId,
				itemId,
			)((item) => {
				const nextParts = updater(item.parts);
				if (nextParts === item.parts) {
					return item;
				}
				ref.current = item.parts;
				return { ...item, parts: nextParts };
			}),
		).current;

const updateItemPart =
	(
		controller: Controller,
		receiptId: ReceiptsId,
		itemId: ReceiptItemsId,
		userId: UsersId,
	) =>
	(updater: utils.UpdateFn<ReceiptItemPart>) =>
		utils.withRef<ReceiptItemPart | undefined>((ref) =>
			updateItemParts(
				controller,
				receiptId,
				itemId,
			)((parts) =>
				replaceInArray(parts, (part) => part.userId === userId, updater, ref),
			),
		).current;

const removeItemPart = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	userId: UsersId,
) =>
	utils.withRef<ItemWithIndex<ReceiptItemPart> | undefined>((ref) =>
		updateItemParts(
			controller,
			receiptId,
			itemId,
		)((parts) => removeFromArray(parts, (part) => userId === part.userId, ref)),
	).current;

const addItemPart =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(itemPart: ReceiptItemPart, index = 0) =>
		updateItemParts(
			controller,
			receiptId,
			itemId,
		)((parts) => addToArray(parts, itemPart, index));

const addItemParts =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(itemParts: ReceiptItemPart[]) =>
		updateItemParts(
			controller,
			receiptId,
			itemId,
		)((parts) =>
			itemParts.reduce((acc, itemPart) => addToArray(acc, itemPart), parts),
		);

const updateParticipants =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ReceiptParticipants>) =>
		utils.withRef<ReceiptParticipants | undefined>((ref) =>
			update(
				controller,
				receiptId,
			)((receipt) => {
				const nextParticipants = updater(receipt.participants);
				if (nextParticipants === receipt.participants) {
					return receipt;
				}
				ref.current = receipt.participants;
				return { ...receipt, participants: nextParticipants };
			}),
		).current;

const updateParticipant =
	(controller: Controller, receiptId: ReceiptsId, participantId: UsersId) =>
	(updater: utils.UpdateFn<ReceiptParticipant>) =>
		utils.withRef<ReceiptParticipant | undefined>((ref) =>
			updateParticipants(
				controller,
				receiptId,
			)((participants) =>
				replaceInArray(
					participants,
					(participant) => participant.userId === participantId,
					updater,
					ref,
				),
			),
		).current;

const addParticipant =
	(controller: Controller, receiptId: ReceiptsId) =>
	(participant: ReceiptParticipant, index = 0) =>
		updateParticipants(
			controller,
			receiptId,
		)((participants) => addToArray(participants, participant, index));

const removeParticipant = (
	controller: Controller,
	receiptId: ReceiptsId,
	participantId: UsersId,
) =>
	utils.withRef<ItemWithIndex<ReceiptParticipant> | undefined>((ref) =>
		updateParticipants(
			controller,
			receiptId,
		)((participants) =>
			removeFromArray(
				participants,
				(participant) => participant.userId === participantId,
				ref,
			),
		),
	).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receipts.get;
	return {
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		add: (receipt: Receipt) => upsert(controller, receipt),
		remove: (receiptId: ReceiptsId) => {
			remove(controller, receiptId);
		},
		updateItem: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: utils.UpdateFn<ReceiptItem>,
		) => updateItem(controller, receiptId, itemId)(updater),
		addParticipant: (receiptId: ReceiptsId, participant: ReceiptParticipant) =>
			addParticipant(controller, receiptId)(participant),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.get;
	return {
		add: (receipt: Receipt) =>
			utils.applyWithRevert(
				() => upsert(controller, receipt),
				() => remove(controller, receipt.id),
			),
		remove: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => upsert(controller, snapshot),
			),
		update: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<Receipt>,
			revertUpdater: utils.SnapshotFn<Receipt>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater,
			),
		addItem: (receiptId: ReceiptsId, item: ReceiptItem) =>
			utils.applyWithRevert(
				() => addItem(controller, receiptId)(item),
				() => removeItem(controller, receiptId, item.id),
			),
		removeItem: (receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
			utils.applyWithRevert(
				() => removeItem(controller, receiptId, itemId),
				({ item, index }) => addItem(controller, receiptId)(item, index),
			),
		updateItem: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: utils.UpdateFn<ReceiptItem>,
			revertUpdater: utils.SnapshotFn<ReceiptItem>,
		) =>
			utils.applyUpdateFnWithRevert(
				updateItem(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemParts: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: utils.UpdateFn<ReceiptItemParts>,
			revertUpdater: utils.SnapshotFn<ReceiptItemParts>,
		) =>
			utils.applyUpdateFnWithRevert(
				updateItemParts(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemPart: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptItemPart>,
			revertUpdater: utils.SnapshotFn<ReceiptItemPart>,
		) =>
			utils.applyUpdateFnWithRevert(
				updateItemPart(controller, receiptId, itemId, userId),
				updater,
				revertUpdater,
			),
		addItemParts: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userIds: UsersId[],
		) =>
			utils.applyWithRevert(
				() =>
					addItemParts(
						controller,
						receiptId,
						itemId,
					)(userIds.map((userId) => ({ userId, part: 1 }))),
				() =>
					userIds.forEach((userId) =>
						removeItemPart(controller, receiptId, itemId, userId),
					),
			),
		removeItemPart: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
		) =>
			utils.applyWithRevert(
				() => removeItemPart(controller, receiptId, itemId, userId),
				({ item: part, index }) =>
					addItemPart(controller, receiptId, itemId)(part, index),
			),
		removeItemPartsByUser: (receiptId: ReceiptsId, userId: UsersId) =>
			utils.applyUpdateFnWithRevert(
				updateAllItems(controller, receiptId),
				(item) => {
					const nextParts = item.parts.filter((part) => part.userId !== userId);
					if (nextParts.length === item.parts.length) {
						return item;
					}
					return { ...item, parts: nextParts };
				},
				(snapshot) => (item) => {
					const snapshottedItem = snapshot.find(({ id }) => id === item.id);
					if (!snapshottedItem) {
						return item;
					}
					const prevPartWithIndex = snapshottedItem.parts
						.map((part, index) => [part, index] as const)
						.find(([part]) => part.userId === userId);
					if (!prevPartWithIndex) {
						return item;
					}
					const nextParts = addToArray(
						item.parts,
						prevPartWithIndex[0],
						prevPartWithIndex[1],
					);
					return { ...item, parts: nextParts };
				},
			),
		removeParticipant: (receiptId: ReceiptsId, participantId: UsersId) =>
			utils.applyWithRevert(
				() => removeParticipant(controller, receiptId, participantId),
				({ item, index }) => addParticipant(controller, receiptId)(item, index),
			),
		updateParticipant: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>,
			revertUpdater: utils.SnapshotFn<ReceiptParticipant>,
		) =>
			utils.applyUpdateFnWithRevert(
				updateParticipant(controller, receiptId, userId),
				updater,
				revertUpdater,
			),
	};
};
