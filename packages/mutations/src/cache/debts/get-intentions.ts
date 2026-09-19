import type { DebtIntention } from "~app/trpc-types";
import type { DebtId } from "~db/ids";
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

const updateIntentions = (
	{ queryClient, procedure }: Controller,
	updater: (intentions: DebtIntention[]) => DebtIntention[],
) =>
	queryClient.setQueryData(procedure.queryKey(), (prevIntentions) =>
		getUpdatedData(prevIntentions, (prevData) => ({
			...prevData,
			items: updater(prevData.items),
		})),
	);

const updateIntention =
	(controller: Controller, debtId: DebtId) =>
	(updater: (intention: DebtIntention) => DebtIntention) =>
		withRef<DebtIntention | undefined>((ref) => {
			updateIntentions(controller, (intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.id === debtId,
					updater,
					ref,
				),
			);
		}).current;

const removeIntention = (controller: Controller, debtId: DebtId) =>
	withRef<ItemWithIndex<DebtIntention> | undefined>((ref) => {
		updateIntentions(controller, (intentions) =>
			removeFromArray(intentions, (intention) => intention.id === debtId, ref),
		);
	}).current;

const addIntention = (
	controller: Controller,
	intention: DebtIntention,
	index = 0,
) => {
	updateIntentions(controller, (intentions) =>
		addToArray(intentions, intention, index),
	);
};

const updateRevert =
	(controller: Controller) =>
	(
		debtId: DebtId,
		updateFn: UpdateFn<DebtIntention>,
		revertFn?: SnapshotFn<DebtIntention>,
	) =>
		applyUpdateFnWithRevert(
			updateIntention(controller, debtId),
			updateFn,
			revertFn,
		);

const update =
	(controller: Controller) =>
	(debtId: DebtId, updateFn: UpdateFn<DebtIntention>) =>
		updateIntention(controller, debtId)(updateFn);

const removeRevert = (controller: Controller) => (debtId: DebtId) =>
	applyWithRevert(
		() => removeIntention(controller, debtId),
		({ index, item }) => addIntention(controller, item, index),
	);

const remove = (controller: Controller) => (debtId: DebtId) =>
	removeIntention(controller, debtId);

const addRevert =
	(controller: Controller) => (intention: DebtIntention, index?: number) =>
		applyWithRevert(
			() => addIntention(controller, intention, index),
			() => {
				removeIntention(controller, intention.id);
			},
		);

const add =
	(controller: Controller) => (intention: DebtIntention, index?: number) =>
		addIntention(controller, intention, index);

const invalidate =
	({ queryClient, procedure }: Controller) =>
	() =>
		withRef<DebtIntention[] | undefined>((ref) => {
			ref.current = queryClient.getQueryData(procedure.queryKey());
			void queryClient.invalidateQueries(procedure.queryFilter());
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
