import React from "react";

import { doNothing } from "remeda";
import { useParams, useRouter } from "solito/navigation";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { Divider } from "~components/divider";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";
import type { AppPage } from "~utils/next";

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
	const userQuery = trpc.users.get.useQuery({ id: userId });
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
	const router = useRouter();
	const back = React.useCallback(
		() => router.replace(`/debts/user/${userId}`),
		[router, userId],
	);
	React.useEffect(() => {
		if (nonZeroAggregatedDebts.length <= 1 && !aggregatedDebtsLoading) {
			back();
		}
	}, [nonZeroAggregatedDebts, aggregatedDebtsLoading, back]);
	return (
		<>
			<PageHeader
				backHref={`/debts/user/${userId}/exchange/`}
				title={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
			>
				<LoadableUser id={userId} />
			</PageHeader>
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
						key={
							nonZeroAggregatedDebts.filter(
								(debt) => debt.currencyCode !== selectedCurrencyCode,
							).length
						}
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

export const DebtsExchangeAllScreen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	const query = trpc.debts.getIdsByUser.useQuery({ userId });
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
	return <DebtsExchangeAllInner query={query} userId={userId} />;
};
