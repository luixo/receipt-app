import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/src/db/models";

import { createController } from "../controller";
import { ReceiptParticipant } from "../types";

const updateReceiptParticipants = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (participants: ReceiptParticipant[]) => ReceiptParticipant[]
) =>
	createController(trpc, receiptId).update((prevData) => {
		const nextParticipants = updater(prevData.participants);
		if (nextParticipants === prevData.participants) {
			return prevData;
		}
		return { ...prevData, participants: nextParticipants };
	});

export const get = (trpc: TRPCReactContext, receiptId: ReceiptsId) =>
	createController(trpc, receiptId).get();

export const add = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	nextReceiptParticipant: ReceiptParticipant,
	index = 0
) =>
	updateReceiptParticipants(trpc, receiptId, (items) => [
		...items.slice(0, index),
		nextReceiptParticipant,
		...items.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	userId: UsersId
) => {
	const removedReceiptParticipantRef = createRef<
		{ index: number; receiptParticipant: ReceiptParticipant } | undefined
	>();
	updateReceiptParticipants(trpc, receiptId, (participants) => {
		const matchedIndex = participants.findIndex(
			(participant) => participant.remoteUserId === userId
		);
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
	receiptId: ReceiptsId,
	userId: UsersId,
	updater: (participant: ReceiptParticipant) => ReceiptParticipant
) => {
	const modifiedReceiptParticipant = createRef<
		ReceiptParticipant | undefined
	>();
	updateReceiptParticipants(trpc, receiptId, (items) => {
		const matchedIndex = items.findIndex(
			(participant) => participant.remoteUserId === userId
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
