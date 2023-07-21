import React from "react";

import { Loading, Spacer, Card, styled } from "@nextui-org/react";
import { BsCurrencyExchange as ExchangeIcon } from "react-icons/bs";
import { MdAdd as AddIcon } from "react-icons/md";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { ShowResolvedDebtsOption } from "app/features/settings/show-resolved-debts-option";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { useRouter } from "app/hooks/use-router";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import { UsersId } from "next-app/src/db/models";

import { UserDebtPreview } from "./user-debt-preview";

const DebtsHeader = styled("div", {
	display: "flex",
	alignContent: "center",
	justifyContent: "center",
	position: "relative",
});

const ResolvedSwitch = styled("div", {
	position: "absolute",
	right: 0,
});

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [aggregatedDebts, nonZeroAggregateDebts] = useAggregatedDebts(query);
	const router = useRouter();
	React.useEffect(() => {
		if (query.data.length === 0) {
			router.replace("/debts");
		}
	}, [query.data, router]);
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
				<DebtsGroup
					debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregateDebts}
				/>
				{nonZeroAggregateDebts.length > 1 ? (
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
				{aggregatedDebts.length !== nonZeroAggregateDebts.length ? (
					<ResolvedSwitch>
						<ShowResolvedDebtsOption />
					</ResolvedSwitch>
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
