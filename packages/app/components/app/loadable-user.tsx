import React from "react";

import { Loading } from "@nextui-org/react";

import { User } from "app/components/app/user";
import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

type InnerProps = {
	query: TRPCQuerySuccessResult<"users.get">;
};

export const LoadableUserInner: React.FC<InnerProps> = ({ query }) => (
	<User
		user={{ ...query.data, id: query.data.localId || query.data.remoteId }}
	/>
);

type Props = Omit<InnerProps, "query"> & {
	id: UsersId;
	viaReceiptId?: ReceiptsId;
};

export const LoadableUser: React.FC<Props> = ({
	id,
	viaReceiptId,
	...props
}) => {
	const query = trpc.users.get.useQuery({ id, viaReceiptId });
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <LoadableUserInner {...props} query={query} />;
};
