import React from "react";

import { Divider, Spinner } from "@nextui-org/react";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { PageHeader } from "app/components/page-header";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useRouter } from "app/hooks/use-router";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { Currency } from "app/utils/currency";
import { noop } from "app/utils/utils";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import type { UsersId } from "next-app/src/db/models";

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
	const [selectedCurrency, setSelectedCurrency] = React.useState<
		Currency | undefined
	>();
	const [
		modalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();
	const onSelectModalCurrency = React.useCallback(
		(currency: Currency) => {
			setSelectedCurrency(currency);
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
			void back();
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
				selectedCurrencyCode={selectedCurrency?.code}
				aggregatedDebts={nonZeroAggregateDebts}
				setSelectedCurrency={setSelectedCurrency}
				onSelectOther={openModal}
			/>
			<CurrenciesPicker
				selectedCurrency={selectedCurrency}
				onChange={onSelectModalCurrency}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				onLoad={noop}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			{selectedCurrency ? (
				<>
					<Divider />
					<PlannedDebts
						userId={userId}
						selectedCurrencyCode={selectedCurrency.code}
						aggregatedDebts={nonZeroAggregateDebts}
						onDone={back}
					/>
				</>
			) : null}
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const DebtsExchangeAll: React.FC<Props> = ({ userId, ...props }) => {
	const query = trpc.debts.getUser.useQuery({ userId });
	const userNameQuery = trpc.users.getName.useQuery({ id: userId });
	if (query.status === "loading") {
		return (
			<>
				<PageHeader>{userNameQuery.data || userId}</PageHeader>
				<Spinner />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeAllInner {...props} query={query} userId={userId} />;
};
