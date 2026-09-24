import type {
	InboundIntention,
	OutboundIntention,
	UserConnectionIntentions,
} from "~app/trpc-types";
import type { UserId } from "~db/ids";
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
	procedure: ControllerContext["trpc"]["userConnectionIntentions"]["getAll"];
}>;

type Direction = "inbound" | "outbound";
type IntentionMapping = {
	inbound: InboundIntention;
	outbound: OutboundIntention;
};

const updateIntentions = (
	{ queryClient, procedure }: Controller,
	updater: (intentions: UserConnectionIntentions) => UserConnectionIntentions,
) =>
	queryClient.setQueryData(procedure.queryKey(), (intentions) =>
		getUpdatedData(intentions, updater),
	);

const updateDirectionIntentions = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	updater: UpdateFn<IntentionMapping[D][]>,
) =>
	withRef<IntentionMapping[D][] | undefined>((ref) => {
		updateIntentions(controller, (intentions) => {
			const prevIntentions = intentions[direction] as IntentionMapping[D][];
			ref.current = prevIntentions;
			const nextIntentions = updater(prevIntentions);
			if (nextIntentions === prevIntentions) {
				return intentions;
			}
			return { ...intentions, [direction]: nextIntentions };
		});
	}).current;

const updateIntention =
	<D extends Direction>(
		controller: Controller,
		direction: Direction,
		userId: UserId,
	) =>
	(updater: UpdateFn<IntentionMapping[D]>) =>
		withRef<IntentionMapping[D] | undefined>((ref) => {
			updateDirectionIntentions<D>(controller, direction, (intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.user.id === userId,
					updater,
					ref,
				),
			);
		}).current;

const removeIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	userId: UserId,
) =>
	withRef<ItemWithIndex<IntentionMapping[D]> | undefined>((ref) => {
		updateDirectionIntentions<D>(controller, direction, (intentions) =>
			removeFromArray(
				intentions,
				(intention) => intention.user.id === userId,
				ref,
			),
		);
	}).current;

const addIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	intention: IntentionMapping[D],
	index = 0,
) => {
	updateDirectionIntentions<D>(controller, direction, (intentions) =>
		addToArray(intentions, intention, index),
	);
};

const updateRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(
		userId: UserId,
		updateFn: UpdateFn<IntentionMapping[D]>,
		revertFn?: SnapshotFn<IntentionMapping[D]>,
	) =>
		applyUpdateFnWithRevert(
			updateIntention<D>(controller, direction, userId),
			updateFn,
			revertFn,
		);

const update =
	<D extends Direction>(controller: Controller, direction: D) =>
	(userId: UserId, updateFn: UpdateFn<IntentionMapping[D]>) =>
		updateIntention<D>(controller, direction, userId)(updateFn);

const removeRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(userId: UserId) =>
		applyWithRevert(
			() => removeIntention(controller, direction, userId),
			({ index, item }) => addIntention(controller, direction, item, index),
		);

const remove =
	<D extends Direction>(controller: Controller, direction: D) =>
	(userId: UserId) =>
	() =>
		removeIntention(controller, direction, userId);

const addRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		applyWithRevert(
			() => addIntention(controller, direction, intention, index),
			() => {
				removeIntention(controller, direction, intention.user.id);
			},
		);

const add =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		addIntention(controller, direction, intention, index);

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = {
		queryClient,
		procedure: trpc.userConnectionIntentions.getAll,
	};
	return {
		inbound: {
			update: update(controller, "inbound"),
			add: add(controller, "inbound"),
			remove: remove(controller, "inbound"),
		},
		outbound: {
			update: update(controller, "outbound"),
			add: add(controller, "outbound"),
			remove: remove(controller, "outbound"),
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = {
		queryClient,
		procedure: trpc.userConnectionIntentions.getAll,
	};
	return {
		inbound: {
			update: updateRevert(controller, "inbound"),
			add: addRevert(controller, "inbound"),
			remove: removeRevert(controller, "inbound"),
		},
		outbound: {
			update: updateRevert(controller, "outbound"),
			add: addRevert(controller, "outbound"),
			remove: removeRevert(controller, "outbound"),
		},
	};
};
