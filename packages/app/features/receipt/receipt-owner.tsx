import React from "react";

import { Loading } from "@nextui-org/react";

import { User } from "app/components/app/user";
import { QueryErrorMessage } from "app/components/query-error-message";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptOwner: React.FC<Props> = ({ receipt }) => {
	const query = trpc.useQuery(["users.get", { id: receipt.ownerUserId }]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return (
		<User
			user={{ ...query.data, id: query.data.localId || query.data.remoteId }}
		/>
	);
};
