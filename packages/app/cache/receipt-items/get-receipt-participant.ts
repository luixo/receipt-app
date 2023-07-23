import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { ReceiptsId, UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"receiptItems.get">;

type ReceiptItemsResult = TRPCQueryOutput<"receiptItems.get">;
type ReceiptParticipant = ReceiptItemsResult["participants"][number];

const updateReceiptParticipants = (
	controller: Controller,
	receiptId: ReceiptsId,
	updater: utils.UpdateFn<ReceiptParticipant[]>,
) =>
	controller.update((input, prevData) => {
		if (input.receiptId !== receiptId) {
			return;
		}
		const nextParticipants = updater(prevData.participants);
		if (nextParticipants === prevData.participants) {
			return prevData;
		}
		return { ...prevData, participants: nextParticipants };
	});

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	participant: ReceiptParticipant,
	index = 0,
) =>
	updateReceiptParticipants(controller, receiptId, (items) =>
		addToArray(items, participant, index),
	);

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	userId: UsersId,
) =>
	utils.withRef<ItemWithIndex<ReceiptParticipant> | undefined>((ref) =>
		updateReceiptParticipants(controller, receiptId, (pariticipants) =>
			removeFromArray(
				pariticipants,
				(participant) => participant.remoteUserId === userId,
				ref,
			),
		),
	).current;

const update =
	(controller: Controller, receiptId: ReceiptsId, userId: UsersId) =>
	(updater: utils.UpdateFn<ReceiptParticipant>) =>
		utils.withRef<ReceiptParticipant | undefined>((ref) =>
			updateReceiptParticipants(controller, receiptId, (pariticipants) =>
				replaceInArray(
					pariticipants,
					(participant) => participant.remoteUserId === userId,
					updater,
					ref,
				),
			),
		).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receiptItems.get");
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>,
		) => update(controller, receiptId, userId)(updater),
		add: (receiptId: ReceiptsId, item: ReceiptParticipant, index = 0) =>
			add(controller, receiptId, item, index),
		remove: (receiptId: ReceiptsId, userId: UsersId) => {
			remove(controller, receiptId, userId);
		},
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receiptItems.get");
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>,
			revertUpdater: utils.SnapshotFn<ReceiptParticipant>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId, userId),
				updater,
				revertUpdater,
			),
		add: (receiptId: ReceiptsId, item: ReceiptParticipant, index = 0) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, item, index),
				() => remove(controller, receiptId, item.remoteUserId),
			),
		remove: (receiptId: ReceiptsId, userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, userId),
				({ item, index }) => add(controller, receiptId, item, index),
			),
	};
};
