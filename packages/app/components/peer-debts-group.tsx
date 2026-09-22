import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";
import type { PeerId } from "~db/ids";

export const PeerDebtsGroup = suspendedFallback<
	Omit<React.ComponentProps<typeof DebtsGroup>, "debts"> & { peerId: PeerId }
>(
	({ peerId, ...props }) => {
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllPeer.queryOptions({ peerId }),
		);
		return <DebtsGroup debts={debts.items} {...props} />;
	},
	<DebtsGroupSkeleton amount={3} />,
);
