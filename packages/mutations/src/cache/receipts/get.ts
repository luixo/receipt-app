import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";
import type { ItemWithIndex } from "~utils/array";
import { addToArray, removeFromArray, replaceInArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getAllInputs,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["receipts"]["get"];
}>;

type Receipt = TRPCQueryOutput<"receipts.get">;

type ReceiptItems = Receipt["items"];
type ReceiptItem = ReceiptItems[number];
type ReceiptItemConsumers = ReceiptItem["consumers"];
type ReceiptItemConsumer = ReceiptItemConsumers[number];

type ReceiptParticipants = Receipt["participants"];
type ReceiptParticipant = ReceiptParticipants[number];

type ReceiptPayers = Receipt["payers"];
type ReceiptPayer = ReceiptPayers[number];

const upsert = ({ queryClient, procedure }: Controller, receipt: Receipt) =>
	queryClient.setQueryData(procedure.queryKey({ id: receipt.id }), receipt);

const remove = (
	{ queryClient, procedure }: Controller,
	receiptId: ReceiptsId,
) =>
	withRef<Receipt | undefined>((ref) => {
		ref.current = queryClient.getQueryData(
			procedure.queryKey({ id: receiptId }),
		);
		return queryClient.invalidateQueries(
			procedure.queryFilter({ id: receiptId }),
		);
	}).current;

const update =
	({ queryClient, procedure }: Controller, receiptId: ReceiptsId) =>
	(updater: UpdateFn<Receipt>) =>
		withRef<Receipt | undefined>((ref) => {
			queryClient.setQueryData(
				procedure.queryKey({ id: receiptId }),
				(receipt) => {
					if (!receipt) {
						return;
					}
					ref.current = receipt;
					return updater(receipt);
				},
			);
		}).current;

const updateAll =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<Receipt>) => {
		const inputs = getAllInputs<"receipts.get">(
			queryClient,
			procedure.queryKey(),
		);
		inputs.forEach((input) => {
			queryClient.setQueryData(procedure.queryKey(input), (receipt) => {
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
	};

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
					return nextItems;
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

const updateItemConsumers =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(updater: UpdateFn<ReceiptItemConsumers>) =>
		withRef<ReceiptItemConsumers | undefined>((ref) =>
			updateItem(
				controller,
				receiptId,
				itemId,
			)((item) => {
				const nextConsumers = updater(item.consumers);
				if (nextConsumers === item.consumers) {
					return item;
				}
				ref.current = item.consumers;
				return { ...item, consumers: nextConsumers };
			}),
		).current;

const updateItemConsumer =
	(
		controller: Controller,
		receiptId: ReceiptsId,
		itemId: ReceiptItemsId,
		userId: UsersId,
	) =>
	(updater: UpdateFn<ReceiptItemConsumer>) =>
		withRef<ReceiptItemConsumer | undefined>((ref) =>
			updateItemConsumers(
				controller,
				receiptId,
				itemId,
			)((consumers) =>
				replaceInArray(
					consumers,
					(consumer) => consumer.userId === userId,
					updater,
					ref,
				),
			),
		).current;

const removeItemConsumer = (
	controller: Controller,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	userId: UsersId,
) =>
	withRef<ItemWithIndex<ReceiptItemConsumer> | undefined>((ref) =>
		updateItemConsumers(
			controller,
			receiptId,
			itemId,
		)((consumers) =>
			removeFromArray(consumers, (consumer) => userId === consumer.userId, ref),
		),
	).current;

const addItemConsumer =
	(controller: Controller, receiptId: ReceiptsId, itemId: ReceiptItemsId) =>
	(consumer: ReceiptItemConsumer, index = 0) =>
		updateItemConsumers(
			controller,
			receiptId,
			itemId,
		)((consumers) => addToArray(consumers, consumer, index));

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

const updatePayers =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: UpdateFn<ReceiptPayers>) =>
		withRef<ReceiptPayers | undefined>((ref) =>
			update(
				controller,
				receiptId,
			)((receipt) => {
				const nextPayers = updater(receipt.payers);
				if (nextPayers === receipt.payers) {
					return receipt;
				}
				ref.current = receipt.payers;
				return { ...receipt, payers: nextPayers };
			}),
		).current;

const updatePayer =
	(controller: Controller, receiptId: ReceiptsId, payerId: UsersId) =>
	(updater: UpdateFn<ReceiptPayer>) =>
		withRef<ReceiptPayer | undefined>((ref) =>
			updatePayers(
				controller,
				receiptId,
			)((payers) =>
				replaceInArray(
					payers,
					(payer) => payer.userId === payerId,
					updater,
					ref,
				),
			),
		).current;

const addPayer =
	(controller: Controller, receiptId: ReceiptsId) =>
	(payer: ReceiptPayer, index = 0) =>
		updatePayers(
			controller,
			receiptId,
		)((payers) => addToArray(payers, payer, index));

const removePayer = (
	controller: Controller,
	receiptId: ReceiptsId,
	payerId: UsersId,
) =>
	withRef<ItemWithIndex<ReceiptPayer> | undefined>((ref) =>
		updatePayers(
			controller,
			receiptId,
		)((payers) =>
			removeFromArray(payers, (payer) => payer.userId === payerId, ref),
		),
	).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.receipts.get };
	return {
		getData: (receiptId: ReceiptsId) =>
			queryClient.getQueryData(trpc.receipts.get.queryKey({ id: receiptId })),
		update: (receiptId: ReceiptsId, updater: UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		updateAll: (updater: UpdateFn<Receipt>) => updateAll(controller)(updater),
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

		updateItemConsumer: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptItemConsumer>,
		) => updateItemConsumer(controller, receiptId, itemId, userId)(updater),
		updatePayer: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptPayer>,
		) => updatePayer(controller, receiptId, userId)(updater),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.receipts.get };
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
		updateItemConsumers: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			updater: UpdateFn<ReceiptItemConsumers>,
			revertUpdater: SnapshotFn<ReceiptItemConsumers>,
		) =>
			applyUpdateFnWithRevert(
				updateItemConsumers(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemConsumer: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptItemConsumer>,
			revertUpdater: SnapshotFn<ReceiptItemConsumer>,
		) =>
			applyUpdateFnWithRevert(
				updateItemConsumer(controller, receiptId, itemId, userId),
				updater,
				revertUpdater,
			),
		addItemConsumer: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
			part: number,
			createdAt: Date,
		) =>
			applyWithRevert(
				() =>
					addItemConsumer(
						controller,
						receiptId,
						itemId,
					)({ userId, part, createdAt }),
				() => removeItemConsumer(controller, receiptId, itemId, userId),
			),
		removeItemConsumer: (
			receiptId: ReceiptsId,
			itemId: ReceiptItemsId,
			userId: UsersId,
		) =>
			applyWithRevert(
				() => removeItemConsumer(controller, receiptId, itemId, userId),
				({ item: consumer, index }) =>
					addItemConsumer(controller, receiptId, itemId)(consumer, index),
			),
		removeItemConsumersByUser: (receiptId: ReceiptsId, userId: UsersId) =>
			applyUpdateFnWithRevert(
				updateAllItems(controller, receiptId),
				(item) => {
					const nextConsumers = item.consumers.filter(
						(consumer) => consumer.userId !== userId,
					);
					if (nextConsumers.length === item.consumers.length) {
						return item;
					}
					return { ...item, consumers: nextConsumers };
				},
				(snapshot) => (item) => {
					const snapshottedItem = snapshot.find(({ id }) => id === item.id);
					if (!snapshottedItem) {
						return item;
					}
					const prevConsumerWithIndex = snapshottedItem.consumers
						.map((consumer, index) => [consumer, index] as const)
						.find(([consumer]) => consumer.userId === userId);
					if (!prevConsumerWithIndex) {
						return item;
					}
					const nextConsumers = addToArray(
						item.consumers,
						prevConsumerWithIndex[0],
						prevConsumerWithIndex[1],
					);
					return { ...item, consumers: nextConsumers };
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
		addPayer: (receiptId: ReceiptsId, payer: ReceiptPayer) =>
			applyWithRevert(
				() => addPayer(controller, receiptId)(payer),
				() => removePayer(controller, receiptId, payer.userId),
			),
		removePayer: (receiptId: ReceiptsId, payerId: UsersId) =>
			applyWithRevert(
				() => removePayer(controller, receiptId, payerId),
				({ item: payer, index }) =>
					addPayer(controller, receiptId)(payer, index),
			),
		updatePayer: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: UpdateFn<ReceiptPayer>,
			revertUpdater: SnapshotFn<ReceiptPayer>,
		) =>
			applyUpdateFnWithRevert(
				updatePayer(controller, receiptId, userId),
				updater,
				revertUpdater,
			),
	};
};
