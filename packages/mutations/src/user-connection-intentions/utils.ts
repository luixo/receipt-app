import type { TRPCMutationOutput } from "~app/trpc";
import type { PeerId } from "~db/ids";

import { update as updateDebts } from "../cache/debts";
import {
	invalidateSuggest as invalidateSuggestPeers,
	update as updatePeers,
} from "../cache/peers";
import type { ControllerContext } from "../types";

export const updatePeerConnected = (
	controllerContext: ControllerContext,
	peerId: PeerId,
	user: TRPCMutationOutput<"userConnectionIntentions.add">["user"],
) => {
	updatePeers(controllerContext, {
		get: (controller) => {
			controller.update(peerId, (peer) => ({
				...peer,
				connectedUser: user,
			}));
		},
		getForeign: (controller) => {
			controller.updateOwn(peerId, (peer) => ({
				...peer,
				connectedUser: user,
			}));
			controller.invalidateForeign();
		},
		getPaged: undefined,
	});
	void invalidateSuggestPeers(controllerContext);
	updateDebts(controllerContext, {
		// A newly connected  user may have new debts for us
		getAll: (controller) => {
			void controller.invalidate();
		},
		getAllPeer: undefined,
		getByPeerPaged: undefined,
		// A newly connected  user may have new debts for us
		getPeersPaged: (controller) => {
			controller.invalidate();
		},
		get: undefined,
		// A newly connected  user may have new intentions for us
		getIntentions: (controller) => {
			void controller.invalidate();
		},
	});
};
