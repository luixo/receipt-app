import React from "react";

import { Button, Loading, Spacer } from "@nextui-org/react";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { useRouter } from "app/hooks/use-router";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import type { UsersId } from "next-app/src/db/models";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

const DebtsExchangeInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [aggregatedDebts, nonZeroAggregateDebts] = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	const router = useRouter();
	const onAllClick = React.useCallback(
		() => router.push(`/debts/user/${userId}/exchange/all`),
		[router, userId],
	);
	return (
		<>
			<Header
				backHref={`/debts/user/${userId}`}
				textChildren={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
			>
				<LoadableUser id={userId} />
			</Header>
			<Spacer y={1} />
			<DebtsGroup
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregateDebts}
			/>
			<Spacer y={1} />
			<Button href={`/debts/user/${userId}/exchange/all`} onClick={onAllClick}>
				Exchange all to one currency
			</Button>
			<Spacer y={1} />
			<Button href={`/debts/user/${userId}/exchange/specific`} disabled>
				Exchange specific currency
			</Button>
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const DebtsExchange: React.FC<Props> = ({ userId, ...props }) => {
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
	return <DebtsExchangeInner {...props} query={query} userId={userId} />;
};
