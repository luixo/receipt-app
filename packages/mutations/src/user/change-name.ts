import type { PeerId, UserId } from "~db/ids";

import {
	invalidateSuggest as invalidateSuggestPeers,
	updateRevert as updateRevertPeers,
} from "../cache/peers";
import { update as updateUser } from "../cache/user";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"user.changeName",
	{ id: UserId }
> = {
	mutationKey: "user.changeName",
	onMutate:
		(controllerContext, { id }) =>
		(updateObject) =>
			updateRevertPeers(controllerContext, {
				get: (controller) =>
					controller.update(
						// Typesystem doesn't know that we use  user id as self peer id
						id as PeerId,
						(peer) => ({ ...peer, name: updateObject.name }),
						(prevPeer) => (peer) => ({ ...peer, name: prevPeer.name }),
					),
				getForeign: (controller) =>
					controller.updateOwn(
						// Typesystem doesn't know that we use  user id as self peer id
						id as PeerId,
						(peer) => ({ ...peer, name: updateObject.name }),
						(prevPeer) => (peer) => ({ ...peer, name: prevPeer.name }),
					),
				getPaged: undefined,
			}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
		updateUser(controllerContext, {
			get: (controller) => {
				controller.update((user) => ({
					...user,
					peer: {
						...user.peer,
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
			text: t("toasts.changeName.error", { ns: "user", errors }),
		}),
};
