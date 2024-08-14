import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReact,
	TRPCReactUtils,
} from "~app/trpc";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db";
import type { ItemWithIndex } from "~utils/array";
import { addToArray, removeFromArray, replaceInArray } from "~utils/array";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getAllInputs,
	withRef,
} from "../utils";

type Controller = TRPCReactUtils["receipts"]["get"];

type Receipt = TRPCQueryOutput<"receipts.get">;

type ReceiptItems = Receipt["items"];
type ReceiptItem = ReceiptItems[number];
type ReceiptItemParts = ReceiptItem["parts"];
type ReceiptItemPart = ReceiptItemParts[number];

type ReceiptParticipants = Receipt["participants"];
type ReceiptParticipant = ReceiptParticipants[number];

type Input = TRPCQueryInput<"receipts.get">;

const getPagedInputs = (trpc: TRPCReact, queryClient: QueryClient) =>
	getAllInputs<"receipts.get">(queryClient, getQueryKey(trpc.receipts.get));

const upsert = (controller: Controller, receipt: Receipt) =>
	controller.setData({ id: receipt.id }, receipt);

const remove = (controller: Controller, receiptId: ReceiptsId) =>
	withRef<Receipt | undefined>((ref) => {
		ref.current = controller.getData({ id: receiptId });
		return controller.invalidate({ id: receiptId });
	}).current;

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: UpdateFn<Receipt>) =>
		withRef<Receipt | undefined>((ref) => {
			controller.setData({ id: receiptId }, (receipt) => {
				if (!receipt) {
					return;
				}
				ref.current = receipt;
				return updater(receipt);
			});
		}).current;

const updateAll =
	(controller: Controller, inputs: Input[]) => (updater: UpdateFn<Receipt>) =>
		inputs.forEach((input) => {
			controller.setData(input, (receipt) => {
				if (!receipt) {
					return;
				}
				const updatedReceipt = updater(receipt);
				if (updatedReceipt === receipt) {
					return;
				}
				return updatedReceipt;
			});
		});

const updateItems =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: UpdateFn<ReceiptItems>) =>
		withRef<ReceiptItems | undefined>((ref) =>
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
	(updater: UpdateFn<ReceiptItem>) =>
		withRef<ReceiptItem[]>(
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
	(updater: UpdateFn<ReceiptItem>) =>
		withRef<ReceiptItem | undefined>((ref) =>
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
	withRef<ItemWithIndex<ReceiptItem> | undefined>((ref) =>
		updateItems(
			controller,
			receiptId,
		)((items) => removeFromArray(items, (item) => itemId === item.id, ref)),
	).current;

const updateItemParts =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(updater: UpdateFn<ReceiptItemParts>) =>
		withRef<ReceiptItemParts | undefined>((ref) =>
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
	(updater: UpdateFn<ReceiptItemPart>) =>
		withRef<ReceiptItemPart | undefined>((ref) =>
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
	withRef<ItemWithIndex<ReceiptItemPart> | undefined>((ref) =>
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
	(updater: UpdateFn<ReceiptParticipants>) =>
		withRef<ReceiptParticipants | undefined>((ref) =>
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
	(updater: UpdateFn<ReceiptParticipant>) =>
		withRef<ReceiptParticipant | undefined>((ref) =>
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
	withRef<ItemWithIndex<ReceiptParticipant> | undefined>((ref) =>
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

export const getController = ({
	trpcUtils,
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = trpcUtils.receipts.get;
	const inputs = getPagedInputs(trpc, queryClient);
	return {
		update: (receiptId: ReceiptsId, updater: UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		updateAll: (updater: UpdateFn<Receipt>) =>
			updateAll(controller, inputs)(updater),
		add: (receipt: Receipt) => upsert(controller, receipt),
		remove: (receiptId: ReceiptsId) => {
			remove(controller, receiptId);
		},
		updateItem: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: UpdateFn<ReceiptItem>,
		) => updateItem(controller, receiptId, itemId)(updater),
		addParticipant: (receiptId: ReceiptsId, participant: ReceiptParticipant) =>
			addParticipant(controller, receiptId)(participant),
	};
};

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.receipts.get;
	return {
		add: (receipt: Receipt) =>
			applyWithRevert(
				() => upsert(controller, receipt),
				() => remove(controller, receipt.id),
			),
		remove: (receiptId: ReceiptsId) =>
			applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => upsert(controller, snapshot),
			),
		update: (
			receiptId: ReceiptsId,
			updater: UpdateFn<Receipt>,
			revertUpdater: SnapshotFn<Receipt>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater,
			),
		addItem: (receiptId: ReceiptsId, item: ReceiptItem) =>
			applyWithRevert(
				() => addItem(controller, receiptId)(item),
				() => removeItem(controller, receiptId, item.id),
			),
		removeItem: (receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
			applyWithRevert(
				() => removeItem(controller, receiptId, itemId),
				({ item, index }) => addItem(controller, receiptId)(item, index),
			),
		updateItem: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: UpdateFn<ReceiptItem>,
			revertUpdater: SnapshotFn<ReceiptItem>,
		) =>
			applyUpdateFnWithRevert(
				updateItem(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemParts: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: UpdateFn<ReceiptItemParts>,
			revertUpdater: SnapshotFn<ReceiptItemParts>,
		) =>
			applyUpdateFnWithRevert(
				updateItemParts(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemPart: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptItemPart>,
			revertUpdater: SnapshotFn<ReceiptItemPart>,
		) =>
			applyUpdateFnWithRevert(
				updateItemPart(controller, receiptId, itemId, userId),
				updater,
				revertUpdater,
			),
		addItemParts: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userIds: UsersId[],
		) =>
			applyWithRevert(
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
			applyWithRevert(
				() => removeItemPart(controller, receiptId, itemId, userId),
				({ item: part, index }) =>
					addItemPart(controller, receiptId, itemId)(part, index),
			),
		removeItemPartsByUser: (receiptId: ReceiptsId, userId: UsersId) =>
			applyUpdateFnWithRevert(
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
			applyWithRevert(
				() => removeParticipant(controller, receiptId, participantId),
				({ item, index }) => addParticipant(controller, receiptId)(item, index),
			),
		updateParticipant: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptParticipant>,
			revertUpdater: SnapshotFn<ReceiptParticipant>,
		) =>
			applyUpdateFnWithRevert(
				updateParticipant(controller, receiptId, userId),
				updater,
				revertUpdater,
			),
	};
};
