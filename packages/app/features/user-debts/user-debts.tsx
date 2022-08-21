import React from "react";

import { Loading, Spacer, Card } from "@nextui-org/react";

import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

import { UserDebtPreview } from "./user-debt-preview";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.get-user">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => (
	<>
		<Header>
			<LoadableUser id={userId} />
		</Header>
		<Spacer y={1} />
		{query.data.map((debt) => (
			<React.Fragment key={debt.id}>
				<Card.Divider />
				<UserDebtPreview debt={debt} />
			</React.Fragment>
		))}
	</>
);

type Props = Omit<InnerProps, "query">;

export const UserDebts: React.FC<Props> = ({ userId, ...props }) => {
	const query = trpc.useQuery(["debts.get-user", { userId }]);
	const userNameQuery = trpc.useQuery(["users.get-name", { id: userId }]);
	if (query.status === "loading") {
		return (
			<>
				<Header h2>{userNameQuery.data || userId}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <UserDebtsInner {...props} query={query} userId={userId} />;
};
