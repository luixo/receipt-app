import React from "react";

import { useParams, useRouter } from "solito/navigation";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { Divider, Spinner } from "~components";
import type { UsersId } from "~db";
import { noop } from "~utils";
import type { AppPage } from "~utils";
import { useShowResolvedDebts } from "~web/hooks/use-show-resolved-debts";

import { CurrenciesGroup } from "./currencies-group";
import { PlannedDebts } from "./planned-debts";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

const DebtsExchangeAllInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [aggregatedDebts, nonZeroAggregateDebts] = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	const topCurrenciesQuery = trpc.currency.topDebts.useQuery();
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
		if (nonZeroAggregateDebts.length <= 1) {
			back();
		}
	}, [nonZeroAggregateDebts, back]);
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
				debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregateDebts}
			/>
			<CurrenciesGroup
				selectedCurrencyCode={selectedCurrencyCode}
				aggregatedDebts={nonZeroAggregateDebts}
				setSelectedCurrencyCode={setSelectedCurrencyCode}
				onSelectOther={openModal}
			/>
			<CurrenciesPicker
				selectedCurrencyCode={selectedCurrencyCode}
				onChange={onSelectModalCurrencyCode}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				onLoad={noop}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			{selectedCurrencyCode ? (
				<>
					<Divider />
					<PlannedDebts
						key={
							nonZeroAggregateDebts.filter(
								(debt) => debt.currencyCode !== selectedCurrencyCode,
							).length
						}
						userId={userId}
						selectedCurrencyCode={selectedCurrencyCode}
						aggregatedDebts={nonZeroAggregateDebts}
						onDone={back}
					/>
				</>
			) : null}
		</>
	);
};

export const DebtsExchangeAllScreen: AppPage = () => {
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
	return <DebtsExchangeAllInner query={query} userId={userId} />;
};
