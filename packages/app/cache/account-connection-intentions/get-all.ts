import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import {
	addToArray,
	ItemWithIndex,
	removeFromArray,
	replaceInArray,
} from "app/utils/array";
import { AccountsId } from "next-app/db/models";

type Controller = utils.GenericController<"accountConnectionIntentions.getAll">;

type Intentions = TRPCQueryOutput<"accountConnectionIntentions.getAll">;
type InboundIntention = Intentions["inbound"][number];
type OutboundIntention = Intentions["outbound"][number];

type Direction = "inbound" | "outbound";
type IntentionMapping = {
	inbound: InboundIntention;
	outbound: OutboundIntention;
};

const updateIntentions = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	updater: (intentions: IntentionMapping[D][]) => IntentionMapping[D][]
) =>
	controller.update((_input, intentions) => {
		const prevIntentions = intentions[direction] as IntentionMapping[D][];
		const nextIntentions = updater(prevIntentions);
		if (nextIntentions === prevIntentions) {
			return intentions;
		}
		return { ...intentions, [direction]: nextIntentions };
	});

const updateIntention =
	<D extends Direction>(
		controller: Controller,
		direction: Direction,
		accountId: AccountsId
	) =>
	(updater: utils.UpdateFn<IntentionMapping[D]>) =>
		utils.withRef<IntentionMapping[D] | undefined>((ref) =>
			updateIntentions<D>(controller, direction, (intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.accountId === accountId,
					updater,
					ref
				)
			)
		);

const removeIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	accountId: AccountsId
) =>
	utils.withRef<ItemWithIndex<IntentionMapping[D]> | undefined>((ref) =>
		updateIntentions<D>(controller, direction, (intentions) =>
			removeFromArray(
				intentions,
				(intention) => intention.accountId === accountId,
				ref
			)
		)
	);

const addIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	intention: IntentionMapping[D],
	index = 0
) => {
	updateIntentions<D>(controller, direction, (intentions) =>
		addToArray(intentions, intention, index)
	);
};

const updateRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(
		accountId: AccountsId,
		updateFn: utils.UpdateFn<IntentionMapping[D]>,
		revertFn?: utils.SnapshotFn<IntentionMapping[D]>
	) =>
		utils.applyUpdateFnWithRevert(
			updateIntention<D>(controller, direction, accountId),
			updateFn,
			revertFn
		);

const update =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId, updateFn: utils.UpdateFn<IntentionMapping[D]>) =>
		updateIntention<D>(controller, direction, accountId)(updateFn);

const removeRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId) =>
		utils.applyWithRevert(
			() => removeIntention(controller, direction, accountId),
			({ index, item }) => addIntention(controller, direction, item, index)
		);

const remove =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId) =>
	() =>
		removeIntention(controller, direction, accountId);

const addRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		utils.applyWithRevert(
			() => addIntention(controller, direction, intention, index),
			() => removeIntention(controller, direction, intention.accountId)
		);

const add =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		addIntention(controller, direction, intention, index);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"accountConnectionIntentions.getAll"
	);
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

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(
		trpc,
		"accountConnectionIntentions.getAll"
	);
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
