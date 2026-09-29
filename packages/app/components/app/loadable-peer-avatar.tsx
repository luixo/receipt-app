import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { PeerAvatar } from "#app/components/app/peer-avatar.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { SkeletonAvatar } from "#components/skeleton-avatar.tsx";
import type { PeerId } from "#db/ids.ts";

type Props = React.ComponentProps<typeof PeerAvatar> & {
	id: PeerId;
	foreign?: boolean;
};

export const LoadablePeerAvatar = suspendedFallback<Props>(
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
			return <PeerAvatar id={data.remoteId} dimmed {...props} />;
		}
		return <PeerAvatar id={id} connectedUser={data.connectedUser} {...props} />;
	},
	SkeletonAvatar,
);
