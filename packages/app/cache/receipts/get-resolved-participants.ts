import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { ReceiptsId, UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"receipts.getResolvedParticipants">;

type ReceiptParticipants = TRPCQueryOutput<"receipts.getResolvedParticipants">;
type ReceiptParticipant = ReceiptParticipants[number];

const updateItems =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ReceiptParticipants>) =>
		utils.withRef<ReceiptParticipants | undefined>((ref) => {
			controller.update((input, amount) => {
				if (input.receiptId !== receiptId) {
					return;
				}
				ref.current = amount;
				return updater(amount);
			});
		});

const upsert = (
	controller: Controller,
	receiptId: ReceiptsId,
	items: ReceiptParticipants
) => controller.upsert({ receiptId }, items);

const invalidate = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<ReceiptParticipants | undefined>((ref) =>
		controller.invalidate((input, participants) => {
			const match = input.receiptId === receiptId;
			if (!match) {
				return false;
			}
			ref.current = participants;
			return true;
		})
	);

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	participant: ReceiptParticipant,
	index = 0
) =>
	updateItems(
		controller,
		receiptId
	)((participants) => addToArray(participants, participant, index));

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	userId: UsersId
) =>
	utils.withRef<ItemWithIndex<ReceiptParticipant> | undefined>((ref) =>
		updateItems(
			controller,
			receiptId
		)((participants) =>
			removeFromArray(
				participants,
				(participant) => participant.remoteUserId === userId,
				ref
			)
		)
	);

const update =
	(controller: Controller, receiptId: ReceiptsId, userId: UsersId) =>
	(updater: utils.UpdateFn<ReceiptParticipant>) =>
		utils.withRef<ReceiptParticipant | undefined>((ref) =>
			updateItems(
				controller,
				receiptId
			)((items) =>
				replaceInArray(
					items,
					(participant) => participant.remoteUserId === userId,
					updater,
					ref
				)
			)
		);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"receipts.getResolvedParticipants"
	);
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>
		) => update(controller, receiptId, userId)(updater),
		add: (receiptId: ReceiptsId, participant: ReceiptParticipant, index = -1) =>
			add(controller, receiptId, participant, index),
		upsert: (receiptId: ReceiptsId, items: ReceiptParticipants) =>
			upsert(controller, receiptId, items),
		invalidate: (receiptId: ReceiptsId) => invalidate(controller, receiptId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"receipts.getResolvedParticipants"
	);
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>,
			revertUpdater: utils.SnapshotFn<ReceiptParticipant>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId, userId),
				updater,
				revertUpdater
			),
		add: (receiptId: ReceiptsId, participant: ReceiptParticipant, index = -1) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, participant, index),
				() => remove(controller, receiptId, participant.remoteUserId)
			),
		remove: (receiptId: ReceiptsId, userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, userId),
				({ item, index }) => add(controller, receiptId, item, index)
			),
		upsert: (receiptId: ReceiptsId, items: ReceiptParticipants) =>
			utils.applyWithRevert(
				() => upsert(controller, receiptId, items),
				() => invalidate(controller, receiptId)
			),
		invalidate: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => invalidate(controller, receiptId),
				(items) => upsert(controller, receiptId, items)
			),
	};
};
