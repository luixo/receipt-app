import React from "react";
import * as ReactNative from "react-native";

import { Loading } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/query-error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { styled } from "app/utils/styles";
import { UsersId } from "next-app/db/models";

import { UserConnectionInput } from "./user-connection-input";
import { UserNameInput } from "./user-name-input";
import { UserPublicNameInput } from "./user-public-name-input";
import { UserRemoveButton } from "./user-remove-button";

const AlignEndView = styled(ReactNative.View)({
	alignSelf: "flex-end",
});

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.get">;
};

const UserInner: React.FC<InnerProps> = ({ query }) => {
	const user = query.data;
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	return (
		<>
			<UserNameInput user={user} isLoading={deleteLoading} />
			<UserPublicNameInput user={user} isLoading={deleteLoading} />
			<UserConnectionInput user={user} isLoading={deleteLoading} />
			<AlignEndView>
				<UserRemoveButton user={user} setLoading={setDeleteLoading} />
			</AlignEndView>
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: UsersId;
};

export const User: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.useQuery(["users.get", { id }]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <UserInner {...props} query={query} />;
};
