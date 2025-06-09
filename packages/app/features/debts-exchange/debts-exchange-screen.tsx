import type React from "react";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { BackLink, ButtonLink } from "~components/link";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

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
	return (
		<>
			<DebtsGroup
				isLoading={aggregatedDebtsLoading}
				errorQueries={aggregatedDebtsErrorQueries}
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts}
			/>
			<ButtonLink
				color="primary"
				to="/debts/user/$id/exchange/all"
				params={{ id: userId }}
				title="Exchange all to one currency"
			>
				Exchange all to one currency
			</ButtonLink>
			<ButtonLink
				color="primary"
				to="/debts/user/$id/exchange/specific"
				params={{ id: userId }}
				isDisabled
				title="Exchange specific currency"
			>
				Exchange specific currency
			</ButtonLink>
		</>
	);
};

type Props = { userId: UsersId };

const DebtsExchangeLoader: React.FC<Props> = ({ userId }) => {
	const query = trpc.debts.getIdsByUser.useQuery({ userId });
	if (query.status === "pending") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeInner query={query} userId={userId} />;
};

export const DebtsExchangeScreen: React.FC<Props> = ({ userId }) => (
	<>
		<PageHeader
			startContent={<BackLink to="/debts/user/$id" params={{ id: userId }} />}
		>
			<LoadableUser id={userId} />
		</PageHeader>
		<DebtsExchangeLoader userId={userId} />
	</>
);
