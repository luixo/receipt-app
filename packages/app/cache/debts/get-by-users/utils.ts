import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { createController } from "./controller";
import { Debts } from "./types";

export const updateUserDebts = (
	trpc: TRPCReactContext,
	userId: UsersId,
	updater: (debts: Debts) => Debts
) =>
	createController(trpc).update((prevData) => {
		const matchedUserIndex = prevData.findIndex(
			(debtsEntry) => debtsEntry.userId === userId
		);
		const matchedUser =
			matchedUserIndex === -1
				? { userId, debts: [] }
				: prevData[matchedUserIndex]!;
		const nextDebts = updater(matchedUser.debts);
		if (nextDebts === matchedUser.debts) {
			return prevData;
		}
		// Remove user from debts list in case of no debts left
		if (nextDebts.length === 0) {
			if (matchedUserIndex === -1) {
				return prevData;
			}
			return [
				...prevData.slice(0, matchedUserIndex),
				...prevData.slice(matchedUserIndex + 1),
			];
		}
		if (matchedUserIndex === -1) {
			return [...prevData, { userId, debts: nextDebts }];
		}
		return [
			...prevData.slice(0, matchedUserIndex),
			{ userId, debts: nextDebts },
			...prevData.slice(matchedUserIndex + 1),
		];
	});
