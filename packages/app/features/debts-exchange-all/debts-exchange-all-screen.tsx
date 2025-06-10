import React from "react";

import { useQuery } from "@tanstack/react-query";
import { doNothing } from "remeda";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useNavigate } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { BackLink } from "~components/link";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

import { CurrenciesGroup } from "./currencies-group";
import { PlannedDebts } from "./planned-debts";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getIdsByUser">;
};

const DebtsExchangeAllInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [
		aggregatedDebts,
		nonZeroAggregatedDebts,
		aggregatedDebtsLoading,
		aggregatedDebtsErrorQueries,
	] = useAggregatedDebts(query);
	const [selectedCurrencyCode, setSelectedCurrencyCode] = React.useState<
		CurrencyCode | undefined
	>();
	const [
		modalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();
	const onSelectModalCurrencyCode = React.useCallback(
		(currencyCode: CurrencyCode) => {
			setSelectedCurrencyCode(currencyCode);
			closeModal();
		},
		[closeModal],
	);
	const navigate = useNavigate();
	const back = React.useCallback(
		() =>
			navigate({
				to: "/debts/user/$id",
				params: { id: userId },
				replace: true,
			}),
		[navigate, userId],
	);
	React.useEffect(() => {
		if (nonZeroAggregatedDebts.length <= 1 && !aggregatedDebtsLoading) {
			back();
		}
	}, [nonZeroAggregatedDebts, aggregatedDebtsLoading, back]);
	return (
		<>
			<DebtsGroup
				className="self-center"
				isLoading={aggregatedDebtsLoading}
				errorQueries={aggregatedDebtsErrorQueries}
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts}
			/>
			<CurrenciesGroup
				selectedCurrencyCode={selectedCurrencyCode}
				isLoading={aggregatedDebtsLoading}
				aggregatedDebts={nonZeroAggregatedDebts}
				setSelectedCurrencyCode={setSelectedCurrencyCode}
				onSelectOther={openModal}
			/>
			<CurrenciesPicker
				selectedCurrencyCode={selectedCurrencyCode}
				onChange={onSelectModalCurrencyCode}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				onLoad={doNothing}
				topQueryOptions={{ type: "debts" }}
			/>
			{selectedCurrencyCode && !aggregatedDebtsLoading ? (
				<>
					<Divider />
					<PlannedDebts
						key={selectedCurrencyCode}
						userId={userId}
						selectedCurrencyCode={selectedCurrencyCode}
						aggregatedDebts={nonZeroAggregatedDebts}
						onDone={back}
					/>
				</>
			) : null}
		</>
	);
};

type Props = { userId: UsersId };

const DebtsExchangeAllLoader: React.FC<Props> = ({ userId }) => {
	const trpc = useTRPC();
	const query = useQuery(trpc.debts.getIdsByUser.queryOptions({ userId }));
	if (query.status === "pending") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeAllInner query={query} userId={userId} />;
};

export const DebtsExchangeAllScreen: React.FC<Props> = ({ userId }) => (
	<>
		<PageHeader
			startContent={
				<BackLink to="/debts/user/$id/exchange" params={{ id: userId }} />
			}
		>
			<LoadableUser id={userId} />
		</PageHeader>
		<DebtsExchangeAllLoader userId={userId} />
	</>
);
