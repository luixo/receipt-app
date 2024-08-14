import type { TRPCMutationOutput } from "~app/trpc";
import type { UsersId } from "~db/models";

import * as cache from "../cache";
import type { ControllerContext } from "../types";

export const updateUserConnected = (
	controllerContext: ControllerContext,
	userId: UsersId,
	account: TRPCMutationOutput<"accountConnectionIntentions.add">["account"],
) => {
	cache.users.update(controllerContext, {
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
	void cache.users.invalidateSuggest(controllerContext);
	cache.debts.update(controllerContext, {
		get: undefined,
		getUser: undefined,
		getByUsers: undefined,
		// A newly connected account may have new intentions for us
		getIntentions: (controller) => controller.invalidate(),
	});
};
