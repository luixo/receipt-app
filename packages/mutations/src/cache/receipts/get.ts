import type { TRPCQueryOutput } from "~app/trpc";
import type { ReceiptId, ReceiptItemId, UserId } from "~db/ids";
import type { ItemWithIndex } from "~utils/array";
import { addToArray, removeFromArray, replaceInArray } from "~utils/array";
import type { Temporal } from "~utils/date";

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
	getUpdatedData,
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

const remove = ({ queryClient, procedure }: Controller, receiptId: ReceiptId) =>
	withRef<Receipt | undefined>((ref) => {
		ref.current = queryClient.getQueryData(
			procedure.queryKey({ id: receiptId }),
		);
		return queryClient.invalidateQueries(
			procedure.queryFilter({ id: receiptId }),
		);
	}).current;

const update =
	({ queryClient, procedure }: Controller, receiptId: ReceiptId) =>
	(updater: UpdateFn<Receipt>) =>
		withRef<Receipt | undefined>((ref) => {
			queryClient.setQueryData(
				procedure.queryKey({ id: receiptId }),
				(receipt) => {
					ref.current = receipt;
					return getUpdatedData(receipt, updater);
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
			queryClient.setQueryData(procedure.queryKey(input), (receipt) =>
				getUpdatedData(receipt, updater),
			);
		});
	};

const updateItems =
	(controller: Controller, receiptId: ReceiptId) =>
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
	(controller: Controller, receiptId: ReceiptId) =>
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
	(controller: Controller, receiptId: ReceiptId, itemId: ReceiptItemId) =>
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
	(controller: Controller, receiptId: ReceiptId) =>
	(item: ReceiptItem, index = 0) =>
		updateItems(
			controller,
			receiptId,
		)((items) => addToArray(items, item, index));

const removeItem = (
	controller: Controller,
	receiptId: ReceiptId,
	itemId: ReceiptItemId,
) =>
	withRef<ItemWithIndex<ReceiptItem> | undefined>((ref) =>
		updateItems(
			controller,
			receiptId,
		)((items) => removeFromArray(items, (item) => itemId === item.id, ref)),
	).current;

const updateItemConsumers =
	(controller: Controller, receiptId: ReceiptId, itemId: ReceiptItemId) =>
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
		receiptId: ReceiptId,
		itemId: ReceiptItemId,
		userId: UserId,
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
	receiptId: ReceiptId,
	itemId: ReceiptItemId,
	userId: UserId,
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
	(controller: Controller, receiptId: ReceiptId, itemId: ReceiptItemId) =>
	(consumer: ReceiptItemConsumer, index = 0) =>
		updateItemConsumers(
			controller,
			receiptId,
			itemId,
		)((consumers) => addToArray(consumers, consumer, index));

const updateParticipants =
	(controller: Controller, receiptId: ReceiptId) =>
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
	(controller: Controller, receiptId: ReceiptId, participantId: UserId) =>
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
	(controller: Controller, receiptId: ReceiptId) =>
	(participant: ReceiptParticipant, index = 0) =>
		updateParticipants(
			controller,
			receiptId,
		)((participants) => addToArray(participants, participant, index));

const removeParticipant = (
	controller: Controller,
	receiptId: ReceiptId,
	participantId: UserId,
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
	(controller: Controller, receiptId: ReceiptId) =>
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
	(controller: Controller, receiptId: ReceiptId, payerId: UserId) =>
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
	(controller: Controller, receiptId: ReceiptId) =>
	(payer: ReceiptPayer, index = 0) =>
		updatePayers(
			controller,
			receiptId,
		)((payers) => addToArray(payers, payer, index));

const removePayer = (
	controller: Controller,
	receiptId: ReceiptId,
	payerId: UserId,
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
		getData: (receiptId: ReceiptId) =>
			queryClient.getQueryData(trpc.receipts.get.queryKey({ id: receiptId })),
		update: (receiptId: ReceiptId, updater: UpdateFn<Receipt>) =>
			update(controller, receiptId)(updater),
		updateAll: (updater: UpdateFn<Receipt>) => updateAll(controller)(updater),
		add: (receipt: Receipt) => upsert(controller, receipt),
		remove: (receiptId: ReceiptId) => {
			remove(controller, receiptId);
		},
		updateItem: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			updater: UpdateFn<ReceiptItem>,
		) => updateItem(controller, receiptId, itemId)(updater),
		addParticipant: (receiptId: ReceiptId, participant: ReceiptParticipant) =>
			addParticipant(controller, receiptId)(participant),

		updateItemConsumer: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			userId: UserId,
			updater: UpdateFn<ReceiptItemConsumer>,
		) => updateItemConsumer(controller, receiptId, itemId, userId)(updater),
		updatePayer: (
			receiptId: ReceiptId,
			userId: UserId,
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
		remove: (receiptId: ReceiptId) =>
			applyWithRevert(
				() => remove(controller, receiptId),
				(snapshot) => upsert(controller, snapshot),
			),
		update: (
			receiptId: ReceiptId,
			updater: UpdateFn<Receipt>,
			revertUpdater: SnapshotFn<Receipt>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater,
			),
		addItem: (receiptId: ReceiptId, item: ReceiptItem) =>
			applyWithRevert(
				() => addItem(controller, receiptId)(item),
				() => removeItem(controller, receiptId, item.id),
			),
		removeItem: (receiptId: ReceiptId, itemId: ReceiptItemId) =>
			applyWithRevert(
				() => removeItem(controller, receiptId, itemId),
				({ item, index }) => addItem(controller, receiptId)(item, index),
			),
		updateItem: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			updater: UpdateFn<ReceiptItem>,
			revertUpdater: SnapshotFn<ReceiptItem>,
		) =>
			applyUpdateFnWithRevert(
				updateItem(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemConsumers: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			updater: UpdateFn<ReceiptItemConsumers>,
			revertUpdater: SnapshotFn<ReceiptItemConsumers>,
		) =>
			applyUpdateFnWithRevert(
				updateItemConsumers(controller, receiptId, itemId),
				updater,
				revertUpdater,
			),
		updateItemConsumer: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			userId: UserId,
			updater: UpdateFn<ReceiptItemConsumer>,
			revertUpdater: SnapshotFn<ReceiptItemConsumer>,
		) =>
			applyUpdateFnWithRevert(
				updateItemConsumer(controller, receiptId, itemId, userId),
				updater,
				revertUpdater,
			),
		addItemConsumer: (
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			userId: UserId,
			part: number,
			createdAt: Temporal.ZonedDateTime,
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
			receiptId: ReceiptId,
			itemId: ReceiptItemId,
			userId: UserId,
		) =>
			applyWithRevert(
				() => removeItemConsumer(controller, receiptId, itemId, userId),
				({ item: consumer, index }) =>
					addItemConsumer(controller, receiptId, itemId)(consumer, index),
			),
		removeItemConsumersByUser: (receiptId: ReceiptId, userId: UserId) =>
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
		removeParticipant: (receiptId: ReceiptId, participantId: UserId) =>
			applyWithRevert(
				() => removeParticipant(controller, receiptId, participantId),
				({ item, index }) => addParticipant(controller, receiptId)(item, index),
			),
		updateParticipant: (
			receiptId: ReceiptId,
			userId: UserId,
			updater: UpdateFn<ReceiptParticipant>,
			revertUpdater: SnapshotFn<ReceiptParticipant>,
		) =>
			applyUpdateFnWithRevert(
				updateParticipant(controller, receiptId, userId),
				updater,
				revertUpdater,
			),
		addPayer: (receiptId: ReceiptId, payer: ReceiptPayer) =>
			applyWithRevert(
				() => addPayer(controller, receiptId)(payer),
				() => removePayer(controller, receiptId, payer.userId),
			),
		removePayer: (receiptId: ReceiptId, payerId: UserId) =>
			applyWithRevert(
				() => removePayer(controller, receiptId, payerId),
				({ item: payer, index }) =>
					addPayer(controller, receiptId)(payer, index),
			),
		updatePayer: (
			receiptId: ReceiptId,
			userId: UserId,
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
