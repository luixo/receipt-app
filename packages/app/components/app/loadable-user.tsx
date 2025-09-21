import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { SkeletonUser, User } from "~app/components/app/user";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import type { UserId } from "~db/ids";

type InnerProps = {
	data: TRPCQueryOutput<"users.getForeign">;
} & Omit<React.ComponentProps<typeof User>, "id" | "name" | "connectedAccount">;

const LoadableUserInner: React.FC<InnerProps> = ({ data, ...props }) => {
	if ("remoteId" in data) {
		return <User id={data.remoteId} name={data.name} dimmed {...props} />;
	}
	return (
		<User
			id={data.id}
			name={data.name}
			connectedAccount={data.connectedAccount}
			{...props}
		/>
	);
};

type DirectionProps = Omit<
	React.ComponentProps<typeof LoadableUserInner>,
	"data"
> & { id: UserId };

const OwnLoadableUser: React.FC<DirectionProps> = ({ id, ...props }) => {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.users.get.queryOptions({ id }));
	return <LoadableUserInner {...props} data={data} />;
};

const ForeignLoadableUser: React.FC<DirectionProps> = ({ id, ...props }) => {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.users.getForeign.queryOptions({ id }));
	return <LoadableUserInner {...props} data={data} />;
};

type Props = DirectionProps & {
	foreign?: boolean;
};

export const LoadableUser = suspendedFallback<Props>(
	({ foreign, ...props }) => {
		if (foreign) {
			return <ForeignLoadableUser {...props} />;
		}
		return <OwnLoadableUser {...props} />;
	},
	SkeletonUser,
);
