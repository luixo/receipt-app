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
		const matchedUser = prevData[userId];
		if (!matchedUser) {
			return prevData;
		}
		const nextUser = updater(matchedUser);
		if (nextUser === matchedUser) {
			return prevData;
		}
		return { ...prevData, [userId]: nextUser };
	});
