import React from "react";

import { Loading, Spacer } from "@nextui-org/react";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useAggregatedDebts } from "app/hooks/use-aggregated-debts";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useRouter } from "app/hooks/use-router";
import { trpc, TRPCQueryOutput, TRPCQuerySuccessResult } from "app/trpc";
import { noop } from "app/utils/utils";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";
import { UsersId } from "next-app/src/db/models";

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
		TRPCQueryOutput<"currency.getList">[number] | undefined
	>();
	const [modalOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();
	const onSelectModalCurrency = React.useCallback(
		(currency: TRPCQueryOutput<"currency.getList">[number]) => {
			setSelectedCurrency(currency);
			closeModal();
		},
		[closeModal]
	);
	const router = useRouter();
	const back = React.useCallback(
		() => router.replace(`/debts/user/${userId}`),
		[router, userId]
	);
	React.useEffect(() => {
		if (nonZeroAggregateDebts.length <= 1) {
			back();
		}
	}, [nonZeroAggregateDebts, back]);
	return (
		<>
			<Header
				backHref={`/debts/user/${userId}/exchange/`}
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
			<CurrenciesGroup
				selectedCurrencyCode={selectedCurrency?.code}
				aggregatedDebts={nonZeroAggregateDebts}
				setSelectedCurrency={setSelectedCurrency}
				onSelectOther={openModal}
			/>
			<Spacer y={1} />
			<CurrenciesPicker
				selectedCurrency={selectedCurrency}
				onChange={onSelectModalCurrency}
				modalOpen={modalOpen}
				onModalClose={closeModal}
				onLoad={noop}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			{selectedCurrency ? (
				<PlannedDebts
					userId={userId}
					selectedCurrencyCode={selectedCurrency.code}
					aggregatedDebts={nonZeroAggregateDebts}
					onDone={back}
				/>
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
				<Header>{userNameQuery.data || userId}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsExchangeAllInner {...props} query={query} userId={userId} />;
};
