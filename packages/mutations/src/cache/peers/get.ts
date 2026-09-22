import type { Peer } from "~app/trpc-types";
import type { PeerId } from "~db/ids";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["peers"]["get"];
}>;

const update =
	({ queryClient, procedure }: Controller, peerId: PeerId) =>
	(updater: UpdateFn<Peer>) =>
		withRef<Peer | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ id: peerId }), (peer) => {
				ref.current = peer;
				return getUpdatedData(peer, updater);
			});
		}).current;

const upsert = ({ queryClient, procedure }: Controller, peer: Peer) =>
	queryClient.setQueryData(procedure.queryKey({ id: peer.id }), peer);

const remove = ({ queryClient, procedure }: Controller, peerId: PeerId) =>
	withRef<Peer | undefined>((ref) => {
		ref.current = queryClient.getQueryData(procedure.queryKey({ id: peerId }));
		void queryClient.invalidateQueries(procedure.queryFilter({ id: peerId }));
	}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.get };
	return {
		update: (peerId: PeerId, updater: UpdateFn<Peer>) =>
			update(controller, peerId)(updater),
		add: (peer: Peer) => upsert(controller, peer),
		remove: (peerId: PeerId) => remove(controller, peerId),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.get };
	return {
		update: (
			peerId: PeerId,
			updater: UpdateFn<Peer>,
			revertUpdater: SnapshotFn<Peer>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, peerId),
				updater,
				revertUpdater,
			),
		add: (peer: Peer) =>
			applyWithRevert(
				() => upsert(controller, peer),
				() => {
					remove(controller, peer.id);
				},
			),
		remove: (peerId: PeerId) =>
			applyWithRevert(
				() => remove(controller, peerId),
				(snapshot) => {
					upsert(controller, snapshot);
				},
			),
	};
};
