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
		const matchedUser = prevData[userId] || [];
		const nextUser = updater(matchedUser);
		if (nextUser === matchedUser) {
			return prevData;
		}
		// Remove user from debts list in case of no debts left
		if (Object.keys(nextUser).length === 0) {
			const nextData = { ...prevData };
			delete nextData[userId];
			return nextData;
		}
		return { ...prevData, [userId]: nextUser };
	});
