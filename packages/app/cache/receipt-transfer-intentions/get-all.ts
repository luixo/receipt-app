import * as utils from "~app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "~app/trpc";
import type { ItemWithIndex } from "~app/utils/array";
import { addToArray, removeFromArray, replaceInArray } from "~app/utils/array";
import type { ReceiptsId } from "~web/db/models";

type Controller = TRPCReactContext["receiptTransferIntentions"]["getAll"];

type Intentions = TRPCQueryOutput<"receiptTransferIntentions.getAll">;
type InboundIntention = Intentions["inbound"][number];
type OutboundIntention = Intentions["outbound"][number];

type Direction = "inbound" | "outbound";
type IntentionMapping = {
	inbound: InboundIntention;
	outbound: OutboundIntention;
};

const updateIntentions =
	<D extends Direction>(controller: Controller, direction: Direction) =>
	(updater: utils.UpdateFn<IntentionMapping[D][]>) =>
		utils.withRef<IntentionMapping[D][] | undefined>((ref) =>
			controller.setData(undefined, (intentions) => {
				if (!intentions) {
					return;
				}
				const prevIntentions = intentions[direction] as IntentionMapping[D][];
				const nextIntentions = updater(prevIntentions);
				if (nextIntentions === prevIntentions) {
					return intentions;
				}
				if (ref) {
					ref.current = prevIntentions;
				}
				return { ...intentions, [direction]: nextIntentions };
			}),
		).current;

const updateIntentionsRevert =
	<D extends Direction>(controller: Controller, direction: Direction) =>
	(
		updateFn: utils.UpdateFn<IntentionMapping[D][]>,
		revertFn?: utils.SnapshotFn<IntentionMapping[D][]>,
	) =>
		utils.applyUpdateFnWithRevert(
			updateIntentions<D>(controller, direction),
			updateFn,
			revertFn,
		);

const updateIntention =
	<D extends Direction>(
		controller: Controller,
		direction: Direction,
		receiptId: ReceiptsId,
	) =>
	(updater: utils.UpdateFn<IntentionMapping[D]>) =>
		utils.withRef<IntentionMapping[D] | undefined>((ref) =>
			updateIntentions<D>(
				controller,
				direction,
			)((intentions) =>
				replaceInArray(
					intentions,
					(intention) => intention.receipt.id === receiptId,
					updater,
					ref,
				),
			),
		).current;

const removeIntention = <D extends Direction>(
	controller: Controller,
	direction: Direction,
	receiptId: ReceiptsId,
) =>
	utils.withRef<ItemWithIndex<IntentionMapping[D]> | undefined>((ref) =>
		updateIntentions<D>(
			controller,
			direction,
		)((intentions) =>
			removeFromArray(
				intentions,
				(intention) => intention.receipt.id === receiptId,
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
	updateIntentions<D>(
		controller,
		direction,
	)((intentions) => addToArray(intentions, intention, index));
};

const updateRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(
		receiptId: ReceiptsId,
		updateFn: utils.UpdateFn<IntentionMapping[D]>,
		revertFn?: utils.SnapshotFn<IntentionMapping[D]>,
	) =>
		utils.applyUpdateFnWithRevert(
			updateIntention<D>(controller, direction, receiptId),
			updateFn,
			revertFn,
		);

const update =
	<D extends Direction>(controller: Controller, direction: D) =>
	(receiptId: ReceiptsId, updateFn: utils.UpdateFn<IntentionMapping[D]>) =>
		updateIntention<D>(controller, direction, receiptId)(updateFn);

const removeRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(receiptId: ReceiptsId) =>
		utils.applyWithRevert(
			() => removeIntention(controller, direction, receiptId),
			({ index, item }) => addIntention(controller, direction, item, index),
		);

const remove =
	<D extends Direction>(controller: Controller, direction: D) =>
	(receiptId: ReceiptsId) =>
	() =>
		removeIntention(controller, direction, receiptId);

const addRevert =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		utils.applyWithRevert(
			() => addIntention(controller, direction, intention, index),
			() => removeIntention(controller, direction, intention.receipt.id),
		);

const add =
	<D extends Direction>(controller: Controller, direction: D) =>
	(intention: IntentionMapping[D], index?: number) =>
		addIntention(controller, direction, intention, index);

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.receiptTransferIntentions.getAll;
	return {
		inbound: {
			updateAll: updateIntentions(controller, "inbound"),
			update: update(controller, "inbound"),
			add: add(controller, "inbound"),
			remove: remove(controller, "inbound"),
		},
		outbound: {
			updateAll: updateIntentions(controller, "outbound"),
			update: update(controller, "outbound"),
			add: add(controller, "outbound"),
			remove: remove(controller, "outbound"),
		},
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.receiptTransferIntentions.getAll;
	return {
		inbound: {
			updateAll: updateIntentionsRevert(controller, "inbound"),
			update: updateRevert(controller, "inbound"),
			add: addRevert(controller, "inbound"),
			remove: removeRevert(controller, "inbound"),
		},
		outbound: {
			updateAll: updateIntentionsRevert(controller, "outbound"),
			update: updateRevert(controller, "outbound"),
			add: addRevert(controller, "outbound"),
			remove: removeRevert(controller, "outbound"),
		},
	};
};
