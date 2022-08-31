import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId, ReceiptsId, UsersId } from "next-app/src/db/models";

import { Participant } from "../types";

import { createBroadController } from "./controller";

export const updateByDebtId = (
	trpc: TRPCReactContext,
	userId: UsersId,
	debtId: DebtsId,
	updater: (participant: Participant) => Participant
) => {
	const modifiedParticipantsRef = createRef<Participant[]>([]);
	createBroadController(trpc).update(([, prevData]) => {
		const matchedParticipantIndex = prevData.findIndex(
			(participant) =>
				participant.userId === userId && participant.debtId === debtId
		);
		if (matchedParticipantIndex === -1) {
			return prevData;
		}
		const matchedParticipant = prevData[matchedParticipantIndex]!;
		modifiedParticipantsRef.current.push(matchedParticipant);
		return [
			...prevData.slice(0, matchedParticipantIndex),
			updater(matchedParticipant),
			...prevData.slice(matchedParticipantIndex + 1),
		];
	});
	return modifiedParticipantsRef.current;
};

export const add = (
	trpc: TRPCReactContext,
	adder: (receiptId: ReceiptsId) => Participant | undefined
) => {
	const addedParticipantsRef = createRef<Participant[]>([]);
	createBroadController(trpc).update(([{ receiptId }, prevData]) => {
		const nextParticipant = adder(receiptId);
		if (!nextParticipant) {
			return prevData;
		}
		addedParticipantsRef.current.push(nextParticipant);
		return [...prevData, nextParticipant];
	});
	return addedParticipantsRef.current;
};

export const removeByDebtId = (
	trpc: TRPCReactContext,
	userId: UsersId,
	debtId: DebtsId
) => {
	const removedParticipantsRef = createRef<Participant[]>([]);
	createBroadController(trpc).update(([, prevData]) => {
		const matchedDebtIndex = prevData.findIndex(
			(participant) =>
				participant.userId === userId && participant.debtId === debtId
		);
		if (matchedDebtIndex === -1) {
			return prevData;
		}
		const matchedDebt = prevData[matchedDebtIndex]!;
		removedParticipantsRef.current.push(matchedDebt);
		return [
			...prevData.slice(0, matchedDebtIndex),
			...prevData.slice(matchedDebtIndex + 1),
		];
	});
	return removedParticipantsRef.current;
};
