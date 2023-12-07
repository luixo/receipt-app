import React from "react";

import { Spinner } from "@nextui-org/react-tailwind";

import { User } from "app/components/app/user";
import { QueryErrorMessage } from "app/components/error-message";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptOwner: React.FC<Props> = ({ receipt }) => {
	const query = trpc.users.get.useQuery({ id: receipt.ownerUserId });
	if (query.status === "loading") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return (
		<User
			user={{ ...query.data, id: query.data.localId || query.data.remoteId }}
		/>
	);
};
