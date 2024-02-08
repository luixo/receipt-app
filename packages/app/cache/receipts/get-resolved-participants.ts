import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import * as utils from "app/cache/utils";
import { trpc } from "app/trpc";
import type {
	TRPCQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import type { ItemWithIndex } from "app/utils/array";
import { addToArray, removeFromArray, replaceInArray } from "app/utils/array";
import { nonNullishGuard } from "app/utils/utils";
import type { ReceiptsId, UsersId } from "next-app/db/models";

type Controller = TRPCReactContext["receipts"]["getResolvedParticipants"];

type ReceiptParticipants = TRPCQueryOutput<"receipts.getResolvedParticipants">;
type ReceiptParticipant = ReceiptParticipants[number];
type Input = TRPCQueryInput<"receipts.getResolvedParticipants">;

const getInputs = (queryClient: QueryClient) =>
	utils.getAllInputs<"receipts.getResolvedParticipants">(
		queryClient,
		getQueryKey(trpc.receipts.getResolvedParticipants),
	);

const updateItems =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<ReceiptParticipants>) =>
		utils.withRef<ReceiptParticipants | undefined>((ref) => {
			ref.current = controller.getData({ receiptId });
			controller.setData({ receiptId }, (items) =>
				items === undefined ? undefined : updater(items),
			);
		}).current;

const upsert = (
	controller: Controller,
	receiptId: ReceiptsId,
	items: ReceiptParticipants,
) => controller.setData({ receiptId }, items);

const invalidate = (controller: Controller, receiptId: ReceiptsId) =>
	utils.withRef<ReceiptParticipants | undefined>((ref) => {
		ref.current = controller.getData({ receiptId });
		return controller.invalidate({ receiptId });
	}).current;

const invalidateBy = (
	controller: Controller,
	inputs: Input[],
	filterFn: (participants: ReceiptParticipants) => boolean,
) => {
	const prevValues = inputs
		.map((input) => {
			const data = controller.getData(input);
			return data ? ([input, data] as const) : null;
		})
		.filter(nonNullishGuard);
	prevValues
		.filter(([, value]) => filterFn(value))
		.forEach(([input]) => {
			void controller.invalidate(input);
		});
};

const add = (
	controller: Controller,
	receiptId: ReceiptsId,
	participant: ReceiptParticipant,
	index = 0,
) =>
	updateItems(
		controller,
		receiptId,
	)((participants) => addToArray(participants, participant, index));

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	userId: UsersId,
) =>
	utils.withRef<ItemWithIndex<ReceiptParticipant> | undefined>((ref) =>
		updateItems(
			controller,
			receiptId,
		)((participants) =>
			removeFromArray(
				participants,
				(participant) => participant.remoteUserId === userId,
				ref,
			),
		),
	).current;

const removeAll = (controller: Controller, inputs: Input[], userId: UsersId) =>
	utils.withRef<
		{
			value: ReceiptParticipant;
			input: Input;
			index: number;
		}[]
	>((ref) => {
		inputs.forEach((input) => {
			updateItems(
				controller,
				input.receiptId,
			)((participants) =>
				removeFromArray(participants, (participant, index) => {
					const matched = participant.remoteUserId === userId;
					if (!matched) {
						return false;
					}
					ref.current.push({ value: participant, input, index });
					return true;
				}),
			);
		});
	}, []).current;

const update =
	(controller: Controller, receiptId: ReceiptsId, userId: UsersId) =>
	(updater: utils.UpdateFn<ReceiptParticipant>) =>
		utils.withRef<ReceiptParticipant | undefined>((ref) =>
			updateItems(
				controller,
				receiptId,
			)((items) =>
				replaceInArray(
					items,
					(participant) => participant.remoteUserId === userId,
					updater,
					ref,
				),
			),
		).current;

export const getController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getResolvedParticipants;
	const inputs = getInputs(queryClient);
	return {
		update: (
			receiptId: ReceiptsId,
			userId: UsersId,
			updater: utils.UpdateFn<ReceiptParticipant>,
		) => update(controller, receiptId, userId)(updater),
		add: (receiptId: ReceiptsId, participant: ReceiptParticipant, index = -1) =>
			add(controller, receiptId, participant, index),
		upsert: (receiptId: ReceiptsId, items: ReceiptParticipants) =>
			upsert(controller, receiptId, items),
		invalidate: (receiptId: ReceiptsId) => invalidate(controller, receiptId),
		invalidateBy: (filterFn: (participants: ReceiptParticipants) => boolean) =>
			invalidateBy(controller, inputs, filterFn),
	};
};

export const getRevertController = ({
	trpcContext,
	queryClient,
}: utils.ControllerContext) => {
	const controller = trpcContext.receipts.getResolvedParticipants;
	const inputs = getInputs(queryClient);
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
		add: (receiptId: ReceiptsId, participant: ReceiptParticipant, index = -1) =>
			utils.applyWithRevert(
				() => add(controller, receiptId, participant, index),
				() => remove(controller, receiptId, participant.remoteUserId),
			),
		remove: (receiptId: ReceiptsId, userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, userId),
				({ item, index }) => add(controller, receiptId, item, index),
			),
		removeAll: (userId: UsersId) =>
			utils.applyWithRevert(
				() => removeAll(controller, inputs, userId),
				(prevRefs) =>
					prevRefs.forEach(({ input, value, index }) =>
						add(controller, input.receiptId, value, index),
					),
			),
		upsert: (receiptId: ReceiptsId, items: ReceiptParticipants) =>
			utils.applyWithRevert(
				() => upsert(controller, receiptId, items),
				() => invalidate(controller, receiptId),
			),
		invalidate: (receiptId: ReceiptsId) =>
			utils.applyWithRevert(
				() => invalidate(controller, receiptId),
				(items) => upsert(controller, receiptId, items),
			),
	};
};
