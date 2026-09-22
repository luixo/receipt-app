import type { TRPCMutationInput } from "~app/trpc";
import type { ForeignPeer, Peer } from "~app/trpc-types";
import type { PeerId } from "~db/ids";

import {
	invalidateSuggest as invalidateSuggestPeers,
	updateRevert as updateRevertPeers,
} from "../cache/peers";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

const applyUpdate =
	(update: TRPCMutationInput<"peers.update">["update"]): UpdateFn<Peer> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "publicName":
				return { ...item, publicName: update.publicName };
		}
	};

const getRevert =
	(update: TRPCMutationInput<"peers.update">["update"]): SnapshotFn<Peer> =>
	(snapshot) =>
	(peer) => {
		switch (update.type) {
			case "name":
				return { ...peer, name: snapshot.name };
			case "publicName":
				return { ...peer, publicName: snapshot.publicName };
		}
	};

type OwnPeerSnapshot = Exclude<ForeignPeer, { remoteId: PeerId }>;

const applyForeignUpdate =
	(
		update: TRPCMutationInput<"peers.update">["update"],
	): UpdateFn<OwnPeerSnapshot> =>
	(peer) => {
		if ("remoteId" in peer) {
			return peer;
		}
		return applyUpdate(update)(peer);
	};

const getForeignRevert =
	(
		update: TRPCMutationInput<"peers.update">["update"],
	): SnapshotFn<OwnPeerSnapshot> =>
	(snapshot) =>
	(peer) => {
		if ("remoteId" in peer || "remoteId" in snapshot) {
			return peer;
		}
		return getRevert(update)(snapshot)(peer);
	};

export const options: UseContextedMutationOptions<"peers.update"> = {
	mutationKey: "peers.update",
	onMutate: (controllerContext) => (updateObject) =>
		updateRevertPeers(controllerContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getForeign: (controller) =>
				controller.updateOwn(
					updateObject.id,
					applyForeignUpdate(updateObject.update),
					getForeignRevert(updateObject.update),
				),
			getPaged: undefined,
		}),
	onSuccess: (controllerContext) => () =>
		invalidateSuggestPeers(controllerContext),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.updatePeer.error", {
				ns: "peers",
				peersAmount: errors.length,
				errors,
			}),
		}),
};
