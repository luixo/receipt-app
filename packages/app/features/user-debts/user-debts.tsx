import React from "react";

import { Loading, Spacer, Card, styled } from "@nextui-org/react";
import { BsCurrencyExchange as ExchangeIcon } from "react-icons/bs";
import { MdAdd as AddIcon } from "react-icons/md";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

import { UserDebtPreview } from "./user-debt-preview";

const DebtsHeader = styled("div", {
	display: "flex",
	alignContent: "center",
	justifyContent: "center",
});

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const aggregatedDebts = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	return (
		<>
			<Header
				backHref="/debts"
				textChildren={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
				aside={
					<IconButton
						key="add"
						href={`/debts/add?userId=${userId}`}
						title="Add debt"
						bordered
						icon={<AddIcon size={24} />}
					/>
				}
			>
				<LoadableUser id={userId} />
			</Header>
			<Spacer y={1} />
			<DebtsHeader>
				<DebtsGroup debts={aggregatedDebts} css={{ alignSelf: "center" }} />
				{aggregatedDebts.filter((debt) => debt.sum).length > 1 ? (
					<>
						<Spacer x={1} />
						<IconButton
							href={`/debts/user/${userId}/exchange/`}
							auto
							bordered
							icon={<ExchangeIcon />}
						/>
					</>
				) : null}
			</DebtsHeader>
			<Spacer y={1} />
			{query.data.map((debt) => (
				<React.Fragment key={debt.id}>
					<Card.Divider />
					<UserDebtPreview debt={debt} />
				</React.Fragment>
			))}
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const UserDebts: React.FC<Props> = ({ userId, ...props }) => {
	const query = trpc.debts.getUser.useQuery({ userId });
	const userNameQuery = trpc.users.getName.useQuery({ id: userId });
	if (query.status === "loading") {
		return (
			<>
				<Header>{userNameQuery.data || userId}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtsInner {...props} query={query} userId={userId} />;
};
