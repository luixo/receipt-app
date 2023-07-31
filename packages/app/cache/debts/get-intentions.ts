import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { DebtsId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.getIntentions">;

type DebtsIntentions = TRPCQueryOutput<"debts.getIntentions">;
type Intention = DebtsIntentions[number];

const updateIntentions = (
	controller: Controller,
	updater: (intentions: Intention[]) => Intention[],
) =>
	controller.update((_input, prevIntentions) => {
		const nextIntentions = updater(prevIntentions);
		return nextIntentions === prevIntentions ? prevIntentions : nextIntentions;
	});

const updateIntention =
	(controller: Controller, debtId: DebtsId) =>
	(updater: (intention: Intention) => Intention) =>
		utils.withRef<Intention | undefined>((ref) =>
			updateIntentions(controller, (intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.id === debtId,
					updater,
					ref,
				),
			),
		).current;

const removeIntention = (controller: Controller, debtId: DebtsId) =>
	utils.withRef<ItemWithIndex<Intention> | undefined>((ref) =>
		updateIntentions(controller, (intentions) =>
			removeFromArray(intentions, (intention) => intention.id === debtId, ref),
		),
	).current;

const addIntention = (
	controller: Controller,
	intention: Intention,
	index = 0,
) => {
	updateIntentions(controller, (intentions) =>
		addToArray(intentions, intention, index),
	);
};

const updateRevert =
	(controller: Controller) =>
	(
		debtId: DebtsId,
		updateFn: utils.UpdateFn<Intention>,
		revertFn?: utils.SnapshotFn<Intention>,
	) =>
		utils.applyUpdateFnWithRevert(
			updateIntention(controller, debtId),
			updateFn,
			revertFn,
		);

const update =
	(controller: Controller) =>
	(debtId: DebtsId, updateFn: utils.UpdateFn<Intention>) =>
		updateIntention(controller, debtId)(updateFn);

const removeRevert = (controller: Controller) => (debtId: DebtsId) =>
	utils.applyWithRevert(
		() => removeIntention(controller, debtId),
		({ index, item }) => addIntention(controller, item, index),
	);

const remove = (controller: Controller) => (debtId: DebtsId) =>
	removeIntention(controller, debtId);

const addRevert =
	(controller: Controller) => (intention: Intention, index?: number) =>
		utils.applyWithRevert(
			() => addIntention(controller, intention, index),
			() => removeIntention(controller, intention.id),
		);

const add =
	(controller: Controller) => (intention: Intention, index?: number) =>
		addIntention(controller, intention, index);

const invalidate = (controller: Controller) => () =>
	utils.withRef<Intention[] | undefined>((ref) =>
		controller.invalidate((_input, participants) => {
			ref.current = participants;
			return true;
		}),
	).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getIntentions");
	return {
		update: update(controller),
		add: add(controller),
		remove: remove(controller),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getIntentions");
	return {
		update: updateRevert(controller),
		add: addRevert(controller),
		remove: removeRevert(controller),
	};
};
