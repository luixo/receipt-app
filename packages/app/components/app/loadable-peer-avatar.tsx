import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { PeerAvatar } from "~app/components/app/peer-avatar";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import type { PeerId } from "~db/ids";

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
		return (
			<PeerAvatar id={id} connectedAccount={data.connectedAccount} {...props} />
		);
	},
	SkeletonAvatar,
);
