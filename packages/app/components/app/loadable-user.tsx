import type React from "react";

import { SkeletonUser, User } from "~app/components/app/user";
import { QueryErrorMessage } from "~app/components/error-message";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { UsersId } from "~db/models";

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.getForeign">;
} & Omit<React.ComponentProps<typeof User>, "id" | "name" | "connectedAccount">;

const LoadableUserInner: React.FC<InnerProps> = ({ query, ...props }) => {
	if ("remoteId" in query.data) {
		return (
			<User id={query.data.remoteId} name={query.data.name} dimmed {...props} />
		);
	}
	return (
		<User
			id={query.data.id}
			name={query.data.name}
			connectedAccount={query.data.connectedAccount}
			{...props}
		/>
	);
};

type DirectionProps = Omit<
	React.ComponentProps<typeof LoadableUserInner>,
	"query"
> & { id: UsersId };

const OwnLoadableUser: React.FC<DirectionProps> = ({ id, ...props }) => {
	const query = trpc.users.get.useQuery({ id });
	if (query.status === "pending") {
		return <SkeletonUser {...props} />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <LoadableUserInner {...props} query={query} />;
};

const ForeignLoadableUser: React.FC<DirectionProps> = ({ id, ...props }) => {
	const query = trpc.users.getForeign.useQuery({ id });
	if (query.status === "pending") {
		return <SkeletonUser {...props} />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <LoadableUserInner {...props} query={query} />;
};

type Props = DirectionProps & {
	foreign?: boolean;
};

export const LoadableUser: React.FC<Props> = ({ foreign, ...props }) => {
	if (foreign) {
		return <ForeignLoadableUser {...props} />;
	}
	return <OwnLoadableUser {...props} />;
};
