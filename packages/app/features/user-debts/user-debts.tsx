import React from "react";

import { Loading, Spacer, styled } from "@nextui-org/react";
import { Button, Divider, Link } from "@nextui-org/react-tailwind";
import { BsCurrencyExchange as ExchangeIcon } from "react-icons/bs";
import { MdAdd as AddIcon } from "react-icons/md";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { ShowResolvedDebtsOption } from "app/features/settings/show-resolved-debts-option";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { useRouter } from "app/hooks/use-router";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import type { UsersId } from "next-app/src/db/models";

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
			void router.replace("/debts");
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
					<Button
						key="add"
						color="primary"
						href={`/debts/add?userId=${userId}`}
						as={Link}
						title="Add debt"
						variant="bordered"
						isIconOnly
					>
						<AddIcon size={24} />
					</Button>
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
						<Button
							color="primary"
							href={`/debts/user/${userId}/exchange/`}
							as={Link}
							variant="bordered"
							isIconOnly
						>
							<ExchangeIcon />
						</Button>
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
					<Divider />
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
