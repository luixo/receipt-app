import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Peer, SkeletonPeer } from "~app/components/app/peer";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";
import type { PeerId } from "~db/ids";

type Props = Omit<
	React.ComponentProps<typeof Peer>,
	"id" | "name" | "connectedUser"
> & {
	id: PeerId;
	foreign?: boolean;
};

export const LoadablePeer = suspendedFallback<Props>(
	({ foreign, id, ...props }) => {
		const trpc = useTRPC();
		const options = foreign
			? trpc.peers.getForeign.queryOptions({ id })
			: trpc.peers.get.queryOptions({ id });
		const { data } = useSuspenseQuery({
			queryKey: options.queryKey,
			queryFn: options.queryFn,
		});
		if ("remoteId" in data) {
			return (
				<Peer
					id={data.remoteId}
					name={data.name}
					{...props}
					avatarProps={{ ...props.avatarProps, dimmed: true }}
				/>
			);
		}
		return (
			<Peer
				id={data.id}
				name={data.name}
				connectedUser={data.connectedUser}
				{...props}
			/>
		);
	},
	SkeletonPeer,
);
