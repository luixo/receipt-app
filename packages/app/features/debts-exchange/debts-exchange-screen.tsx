import type React from "react";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { BackLink, PageHeader } from "~app/components/page-header";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Link } from "~components/link";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

type HeaderProps = {
	userId: UsersId;
	title: string;
};

const Header: React.FC<HeaderProps> = ({ userId, title }) => (
	<PageHeader
		startContent={<BackLink to="/debts/user/$id" params={{ id: userId }} />}
		title={title}
	>
		<LoadableUser id={userId} />
	</PageHeader>
);

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getIdsByUser">;
};

const DebtsExchangeInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [
		aggregatedDebts,
		nonZeroAggregatedDebts,
		aggregatedDebtsLoading,
		aggregatedDebtsErrorQueries,
	] = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	return (
		<>
			<Header
				userId={userId}
				title={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
			/>
			<DebtsGroup
				isLoading={aggregatedDebtsLoading}
				errorQueries={aggregatedDebtsErrorQueries}
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts}
			/>
			<Button
				color="primary"
				as={Link<"/debts/user/$id/exchange/all">}
				to="/debts/user/$id/exchange/all"
				params={{ id: userId }}
				title="Exchange all to one currency"
			>
				Exchange all to one currency
			</Button>
			<Button
				color="primary"
				as={Link<"/debts/user/$id/exchange/specific">}
				to="/debts/user/$id/exchange/specific"
				params={{ id: userId }}
				isDisabled
				title="Exchange specific currency"
			>
				Exchange specific currency
			</Button>
		</>
	);
};

export const DebtsExchangeScreen: React.FC<{ userId: UsersId }> = ({
	userId,
}) => {
	const query = trpc.debts.getIdsByUser.useQuery({ userId });
	if (query.status === "pending") {
		return (
			<>
				<Header userId={userId} title="Loading user debts..." />
				<Spinner />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeInner query={query} userId={userId} />;
};
