import React from "react";

import { Loading } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/query-error-message";
import { User } from "app/components/user";
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
	const query = trpc.useQuery(["users.get", { id, viaReceiptId }]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <LoadableUserInner {...props} query={query} />;
};
