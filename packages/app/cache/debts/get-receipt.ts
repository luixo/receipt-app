import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { ReceiptsId, UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.getReceipt">;

type ParticipantDebts = TRPCQueryOutput<"debts.getReceipt">;
type ParticipantDebt = ParticipantDebts[number];

const update =
	(controller: Controller, receiptId: ReceiptsId, userId: UsersId) =>
	(updater: utils.UpdateFn<ParticipantDebt>) =>
		utils.withRef<ParticipantDebt | undefined>((ref) => {
			controller.update((input, participants) => {
				if (input.receiptId !== receiptId) {
					return;
				}
				return replaceInArray(
					participants,
					(participant) => participant.userId === userId,
					updater,
					ref
				);
			});
		});

const updateAllInReceipt =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ParticipantDebt[]>) =>
		utils.withRef<ParticipantDebt[] | undefined>((ref) => {
			controller.update((input, participants) => {
				if (input.receiptId !== receiptId) {
					return;
				}
				const nextParticipants = updater(participants);
				if (nextParticipants === participants) {
					return;
				}
				ref.current = participants;
				return nextParticipants;
			});
		});

const remove = (controller: Controller, userId: UsersId) => {
	const receiptIdRef = utils.createRef<ReceiptsId | undefined>();
	const itemWithIndex = utils.withRef<
		ItemWithIndex<ParticipantDebt> | undefined
	>((ref) =>
		controller.update((input, participants) =>
			removeFromArray(
				participants,
				(participant) => {
					const match = participant.userId === userId;
					if (match) {
						receiptIdRef.current = input.receiptId;
					}
					return match;
				},
				ref
			)
		)
	);
	if (itemWithIndex && receiptIdRef.current) {
		return {
			...itemWithIndex,
			receiptId: receiptIdRef.current,
		};
	}
};

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	debt: ParticipantDebt,
	index = 0
) => {
	controller.update((input, prevParticipants) => {
		if (input.receiptId !== receiptId) {
			return;
		}
		return addToArray(prevParticipants, debt, index);
	});
};

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getReceipt");
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ParticipantDebt>
		) => update(controller, receiptId, userId)(updater),
		updateAllInReceipt: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<ParticipantDebt[]>
		) => updateAllInReceipt(controller, receiptId)(updater),
		add: (receiptId: ReceiptsId, debt: ParticipantDebt, index = -1) =>
			add(controller, receiptId, debt, index),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getReceipt");
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ParticipantDebt>,
			revertUpdater: utils.SnapshotFn<ParticipantDebt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId, userId),
				updater,
				revertUpdater
			),
		updateAllInReceipt: (
			receiptId: ReceiptsId,
			updater: utils.UpdateFn<ParticipantDebt[]>,
			revertUpdater: utils.SnapshotFn<ParticipantDebt[]>
		) =>
			utils.applyUpdateFnWithRevert(
				updateAllInReceipt(controller, receiptId),
				updater,
				revertUpdater
			),
		add: (receiptId: ReceiptsId, debt: ParticipantDebt, index = -1) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, debt, index),
				() => remove(controller, debt.userId)
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				({ receiptId, item, index }) => add(controller, receiptId, item, index)
			),
	};
};
