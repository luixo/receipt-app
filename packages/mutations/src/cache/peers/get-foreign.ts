import type { ForeignPeer } from "~app/trpc-types";
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
	getAllInputs,
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["peers"]["getForeign"];
}>;

type OwnPeer = Exclude<ForeignPeer, { remoteId: string }>;

const update =
	({ queryClient, procedure }: Controller, peerId: PeerId) =>
	(updater: UpdateFn<ForeignPeer>) =>
		withRef<ForeignPeer | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ id: peerId }), (peer) => {
				ref.current = peer;
				return getUpdatedData(peer, updater);
			});
		}).current;

const updateOwn =
	(controller: Controller, peerId: PeerId) => (updater: UpdateFn<OwnPeer>) =>
		update(
			controller,
			peerId,
		)((peer) => {
			if ("remoteId" in peer) {
				return peer;
			}
			return updater(peer);
		}) as OwnPeer | undefined;

const removeOwn = ({ queryClient, procedure }: Controller, peerId: PeerId) =>
	withRef<OwnPeer | undefined>((ref) => {
		const currentPeer = queryClient.getQueryData(
			procedure.queryKey({ id: peerId }),
		);
		if (currentPeer && "remoteId" in currentPeer) {
			return;
		}
		ref.current = currentPeer;
		void queryClient.invalidateQueries(procedure.queryFilter({ id: peerId }));
	}).current;

const addOwn = ({ queryClient, procedure }: Controller, peer: OwnPeer) =>
	queryClient.setQueryData(procedure.queryKey({ id: peer.id }), peer);

const invalidateForeign = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"peers.getForeign">(
		queryClient,
		procedure.queryKey(),
	);
	for (const input of inputs) {
		const currentPeer = queryClient.getQueryData(procedure.queryKey(input));
		if (!currentPeer || !("publicName" in currentPeer)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
		}
	}
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.getForeign };
	return {
		updateOwn: (peerId: PeerId, updater: UpdateFn<OwnPeer>) =>
			updateOwn(controller, peerId)(updater),
		invalidateForeign: () => invalidateForeign(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.getForeign };
	return {
		updateOwn: (
			peerId: PeerId,
			updater: UpdateFn<OwnPeer>,
			revertUpdater: SnapshotFn<OwnPeer>,
		) =>
			applyUpdateFnWithRevert(
				updateOwn(controller, peerId),
				updater,
				revertUpdater,
			),
		removeOwn: (peerId: PeerId) =>
			applyWithRevert(
				() => removeOwn(controller, peerId),
				(snapshot) => {
					addOwn(controller, snapshot);
				},
			),
	};
};
