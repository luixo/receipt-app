import type { TRPCMutationOutput } from "~app/trpc";
import type { UsersId } from "~db/models";

import { update as updateDebts } from "../cache/debts";
import {
	invalidateSuggest as invalidateSuggestUsers,
	update as updateUsers,
} from "../cache/users";
import type { ControllerContext } from "../types";

export const updateUserConnected = (
	controllerContext: ControllerContext,
	userId: UsersId,
	account: TRPCMutationOutput<"accountConnectionIntentions.add">["account"],
) => {
	updateUsers(controllerContext, {
		get: (controller) =>
			controller.update(userId, (user) => ({
				...user,
				connectedAccount: account,
			})),
		getForeign: (controller) => {
			controller.updateOwn(userId, (user) => ({
				...user,
				connectedAccount: account,
			}));
			controller.invalidateForeign();
		},
		getPaged: undefined,
	});
	void invalidateSuggestUsers(controllerContext);
	updateDebts(controllerContext, {
		// A newly connected account may have new debts for us
		getAll: (controller) => {
			void controller.invalidate();
		},
		getAllUser: undefined,
		getByUserPaged: undefined,
		// A newly connected account may have new debts for us
		getUsersPaged: (controller) => {
			void controller.invalidate();
		},
		get: undefined,
		// A newly connected account may have new intentions for us
		getIntentions: (controller) => controller.invalidate(),
	});
};
