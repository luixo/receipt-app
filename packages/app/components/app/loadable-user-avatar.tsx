import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { UserAvatar } from "~app/components/app/user-avatar";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import type { UserId } from "~db/ids";

type Props = React.ComponentProps<typeof UserAvatar> & {
	id: UserId;
	foreign?: boolean;
};

export const LoadableUserAvatar = suspendedFallback<Props>(
	({ foreign, id, ...props }) => {
		const trpc = useTRPC();
		const options = foreign
			? trpc.users.getForeign.queryOptions({ id })
			: trpc.users.get.queryOptions({ id });
		const { data } = useSuspenseQuery({
			queryKey: options.queryKey,
			queryFn: options.queryFn,
		});
		if ("remoteId" in data) {
			return <UserAvatar id={data.remoteId} dimmed {...props} />;
		}
		return (
			<UserAvatar id={id} connectedAccount={data.connectedAccount} {...props} />
		);
	},
	SkeletonAvatar,
);
