import type { AccountId, PeerId } from "~db/ids";

import { update as updateAccount } from "../cache/account";
import {
	invalidateSuggest as invalidateSuggestPeers,
	updateRevert as updateRevertPeers,
} from "../cache/peers";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"account.changeName",
	{ id: AccountId }
> = {
	mutationKey: "account.changeName",
	onMutate:
		(controllerContext, { id }) =>
		(updateObject) =>
			updateRevertPeers(controllerContext, {
				get: (controller) =>
					controller.update(
						// Typesystem doesn't know that we use account id as self peer id
						id as PeerId,
						(peer) => ({ ...peer, name: updateObject.name }),
						(prevPeer) => (peer) => ({ ...peer, name: prevPeer.name }),
					),
				getForeign: (controller) =>
					controller.updateOwn(
						// Typesystem doesn't know that we use account id as self peer id
						id as PeerId,
						(peer) => ({ ...peer, name: updateObject.name }),
						(prevPeer) => (peer) => ({ ...peer, name: prevPeer.name }),
					),
				getPaged: undefined,
			}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
		updateAccount(controllerContext, {
			get: (controller) => {
				controller.update((account) => ({
					...account,
					peer: {
						...account.peer,
						name: updateObject.name,
					},
				}));
			},
		});
		void invalidateSuggestPeers(controllerContext);
	},
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changeName.error", { ns: "account", errors }),
		}),
};
