import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/src/db/models";

import { createController } from "./controller";
import { Participant } from "./types";

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	userId: UsersId,
	updater: (participant: Participant) => Participant
) => {
	const modifiedParticipantRef = createRef<Participant | undefined>();
	createController(trpc, receiptId).update((prevData) => {
		const matchedParticipantIndex = prevData.findIndex(
			(participant) => participant.userId === userId
		);
		if (matchedParticipantIndex === -1) {
			return prevData;
		}
		modifiedParticipantRef.current = prevData[matchedParticipantIndex]!;
		return [
			...prevData.slice(0, matchedParticipantIndex),
			updater(modifiedParticipantRef.current),
			...prevData.slice(matchedParticipantIndex + 1),
		];
	});
	return modifiedParticipantRef.current;
};

export const add = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	nextParticipant: Participant
) => {
	createController(trpc, receiptId).update((prevData) => [
		...prevData,
		nextParticipant,
	]);
};

export const remove = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	userId: UsersId
) => {
	const removedParticipantRef = createRef<Participant | undefined>();
	createController(trpc, receiptId).update((prevData) => {
		const matchedDebtIndex = prevData.findIndex(
			(participant) => participant.userId === userId
		);
		if (matchedDebtIndex === -1) {
			return prevData;
		}
		removedParticipantRef.current = prevData[matchedDebtIndex]!;
		return [
			...prevData.slice(0, matchedDebtIndex),
			...prevData.slice(matchedDebtIndex + 1),
		];
	});
	return removedParticipantRef.current;
};

export const invalidate = (trpc: TRPCReactContext, receiptId: ReceiptsId) =>
	createController(trpc, receiptId).invalidate();
