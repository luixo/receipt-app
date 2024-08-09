import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";
import type { AccountsId } from "~db";
import type { ItemWithIndex } from "~utils";
import { addToArray, removeFromArray, replaceInArray } from "~utils";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["accountConnectionIntentions"]["getAll"];

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
	updater: (intentions: IntentionMapping[D][]) => IntentionMapping[D][],
) =>
	controller.setData(undefined, (intentions) => {
		if (!intentions) {
			return;
		}
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
		accountId: AccountsId,
	) =>
	(updater: UpdateFn<IntentionMapping[D]>) =>
		withRef<IntentionMapping[D] | undefined>((ref) =>
			updateIntentions<D>(controller, direction, (intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.account.id === accountId,
					updater,
					ref,
				),
			),
		).current;

const removeIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	accountId: AccountsId,
) =>
	withRef<ItemWithIndex<IntentionMapping[D]> | undefined>((ref) =>
		updateIntentions<D>(controller, direction, (intentions) =>
			removeFromArray(
				intentions,
				(intention) => intention.account.id === accountId,
				ref,
			),
		),
	).current;

const addIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	intention: IntentionMapping[D],
	index = 0,
) => {
	updateIntentions<D>(controller, direction, (intentions) =>
		addToArray(intentions, intention, index),
	);
};

const updateRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(
		accountId: AccountsId,
		updateFn: UpdateFn<IntentionMapping[D]>,
		revertFn?: SnapshotFn<IntentionMapping[D]>,
	) =>
		applyUpdateFnWithRevert(
			updateIntention<D>(controller, direction, accountId),
			updateFn,
			revertFn,
		);

const update =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId, updateFn: UpdateFn<IntentionMapping[D]>) =>
		updateIntention<D>(controller, direction, accountId)(updateFn);

const removeRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId) =>
		applyWithRevert(
			() => removeIntention(controller, direction, accountId),
			({ index, item }) => addIntention(controller, direction, item, index),
		);

const remove =
	<D extends Direction>(controller: Controller, direction: D) =>
	(accountId: AccountsId) =>
	() =>
		removeIntention(controller, direction, accountId);

const addRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		applyWithRevert(
			() => addIntention(controller, direction, intention, index),
			() => removeIntention(controller, direction, intention.account.id),
		);

const add =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		addIntention(controller, direction, intention, index);

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.accountConnectionIntentions.getAll;
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

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.accountConnectionIntentions.getAll;
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
