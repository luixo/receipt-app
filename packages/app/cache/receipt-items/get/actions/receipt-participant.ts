import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

import { createController } from "../controller";
import { ReceiptItemsGetInput, ReceiptParticipant } from "../types";

const updateReceiptParticipants = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (participants: ReceiptParticipant[]) => ReceiptParticipant[]
) =>
	createController(trpc, input).update((prevData) => {
		const nextParticipants = updater(prevData.participants);
		if (nextParticipants === prevData.participants) {
			return prevData;
		}
		return { ...prevData, participants: nextParticipants };
	});

export const add = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	nextReceiptParticipant: ReceiptParticipant,
	index = 0
) =>
	updateReceiptParticipants(trpc, input, (items) => [
		...items.slice(0, index),
		nextReceiptParticipant,
		...items.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	shouldRemove: (participant: ReceiptParticipant) => boolean
) => {
	const removedReceiptParticipantRef = createRef<
		{ index: number; receiptParticipant: ReceiptParticipant } | undefined
	>();
	updateReceiptParticipants(trpc, input, (participants) => {
		const matchedIndex = participants.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return participants;
		}
		removedReceiptParticipantRef.current = {
			index: matchedIndex,
			receiptParticipant: participants[matchedIndex]!,
		};
		return [
			...participants.slice(0, matchedIndex),
			...participants.slice(matchedIndex + 1),
		];
	});
	return removedReceiptParticipantRef.current;
};

export const update = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	userId: UsersId,
	updater: (participant: ReceiptParticipant) => ReceiptParticipant
) => {
	const modifiedReceiptParticipant = createRef<
		ReceiptParticipant | undefined
	>();
	updateReceiptParticipants(trpc, input, (items) => {
		const matchedIndex = items.findIndex(
			(participant) => participant.userId === userId
		);
		if (matchedIndex === -1) {
			return items;
		}
		modifiedReceiptParticipant.current = items[matchedIndex]!;
		return [
			...items.slice(0, matchedIndex),
			updater(modifiedReceiptParticipant.current),
			...items.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptParticipant.current;
};
