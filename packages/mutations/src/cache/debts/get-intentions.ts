import type { TRPCQueryOutput } from "~app/trpc";
import type { DebtsId } from "~db/models";
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
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debtIntentions"]["getAll"];
}>;

type DebtsIntentions = TRPCQueryOutput<"debtIntentions.getAll">;
type Intention = DebtsIntentions[number];

const updateIntentions = (
	{ queryClient, procedure }: Controller,
	updater: (intentions: Intention[]) => Intention[],
) =>
	queryClient.setQueryData(procedure.queryKey(), (prevIntentions) =>
		getUpdatedData(prevIntentions, updater),
	);

const updateIntention =
	(controller: Controller, debtId: DebtsId) =>
	(updater: (intention: Intention) => Intention) =>
		withRef<Intention | undefined>((ref) =>
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
	withRef<ItemWithIndex<Intention> | undefined>((ref) =>
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
		updateFn: UpdateFn<Intention>,
		revertFn?: SnapshotFn<Intention>,
	) =>
		applyUpdateFnWithRevert(
			updateIntention(controller, debtId),
			updateFn,
			revertFn,
		);

const update =
	(controller: Controller) =>
	(debtId: DebtsId, updateFn: UpdateFn<Intention>) =>
		updateIntention(controller, debtId)(updateFn);

const removeRevert = (controller: Controller) => (debtId: DebtsId) =>
	applyWithRevert(
		() => removeIntention(controller, debtId),
		({ index, item }) => addIntention(controller, item, index),
	);

const remove = (controller: Controller) => (debtId: DebtsId) =>
	removeIntention(controller, debtId);

const addRevert =
	(controller: Controller) => (intention: Intention, index?: number) =>
		applyWithRevert(
			() => addIntention(controller, intention, index),
			() => removeIntention(controller, intention.id),
		);

const add =
	(controller: Controller) => (intention: Intention, index?: number) =>
		addIntention(controller, intention, index);

const invalidate =
	({ queryClient, procedure }: Controller) =>
	() =>
		withRef<Intention[] | undefined>((ref) => {
			ref.current = queryClient.getQueryData(procedure.queryKey());
			return queryClient.invalidateQueries(procedure.queryFilter());
		}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debtIntentions.getAll };
	return {
		update: update(controller),
		add: add(controller),
		remove: remove(controller),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debtIntentions.getAll };
	return {
		update: updateRevert(controller),
		add: addRevert(controller),
		remove: removeRevert(controller),
		invalidate: invalidate(controller),
	};
};
