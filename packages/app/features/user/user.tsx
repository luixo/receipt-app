import React from "react";

import { Loading, Spacer } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

import { UserConnectionInput } from "./user-connection-input";
import { UserNameInput } from "./user-name-input";
import { UserPublicNameInput } from "./user-public-name-input";
import { UserRemoveButton } from "./user-remove-button";

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.get">;
};

const UserInner: React.FC<InnerProps> = ({ query }) => {
	const user = query.data;
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	return (
		<>
			<UserNameInput user={user} isLoading={deleteLoading} />
			<Spacer y={1} />
			<UserPublicNameInput user={user} isLoading={deleteLoading} />
			<Spacer y={1} />
			<UserConnectionInput user={user} isLoading={deleteLoading} />
			<Spacer y={1} />
			<UserRemoveButton
				css={{ alignSelf: "flex-end" }}
				user={user}
				setLoading={setDeleteLoading}
			/>
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: UsersId;
};

export const User: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.users.get.useQuery({ id });
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserInner {...props} query={query} />;
};
