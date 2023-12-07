import React from "react";

import { Spinner } from "@nextui-org/react-tailwind";

import { User } from "app/components/app/user";
import { QueryErrorMessage } from "app/components/error-message";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.get">;
} & Omit<React.ComponentProps<typeof User>, "user">;

export const LoadableUserInner: React.FC<InnerProps> = ({
	query,
	...props
}) => (
	<User
		user={{ ...query.data, id: query.data.localId || query.data.remoteId }}
		{...props}
	/>
);

type Props = Omit<InnerProps, "query"> & {
	id: UsersId;
};

export const LoadableUser: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.users.get.useQuery({ id });
	if (query.status === "loading") {
		return <Spinner className={props.className} />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <LoadableUserInner {...props} query={query} />;
};
