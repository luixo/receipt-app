import React from "react";

import { Button, Link, Spinner } from "@nextui-org/react";
import { useParams } from "solito/navigation";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { PageHeader } from "app/components/page-header";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import type { UsersId } from "next-app/src/db/models";
import type { AppPage } from "next-app/types/page";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

const DebtsExchangeInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [aggregatedDebts, nonZeroAggregateDebts] = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	return (
		<>
			<PageHeader
				backHref={`/debts/user/${userId}`}
				title={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
			>
				<LoadableUser id={userId} />
			</PageHeader>
			<DebtsGroup
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregateDebts}
			/>
			<Button
				color="primary"
				as={Link}
				href={`/debts/user/${userId}/exchange/all`}
			>
				Exchange all to one currency
			</Button>
			<Button
				color="primary"
				as={Link}
				href={`/debts/user/${userId}/exchange/specific`}
				isDisabled
			>
				Exchange specific currency
			</Button>
		</>
	);
};

export const DebtsExchangeScreen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	const query = trpc.debts.getUser.useQuery({ userId });
	if (query.status === "pending") {
		return (
			<>
				<PageHeader>
					<LoadableUser id={userId} />
				</PageHeader>
				<Spinner />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeInner query={query} userId={userId} />;
};
