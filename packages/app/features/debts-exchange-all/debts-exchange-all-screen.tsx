import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { doNothing } from "remeda";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useNavigate } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { BackLink } from "~components/link";
import type { UsersId } from "~db/models";

import { CurrenciesGroup } from "./currencies-group";
import { PlannedDebts } from "./planned-debts";

const ExchangeDebtsGroup = suspendedFallback<{ userId: UsersId }>(
	({ userId }) => {
		const [showResolvedDebts] = useShowResolvedDebts();
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
		return (
			<DebtsGroup
				className="self-center"
				debts={showResolvedDebts ? debts : nonResolvedDebts}
			/>
		);
	},
	<DebtsGroupSkeleton amount={3} />,
);

export const DebtsExchangeAllScreen: React.FC<{
	userId: UsersId;
	fromState: SearchParamState<"/debts/user/$id/exchange/all", "from">;
}> = ({ userId, fromState }) => {
	const [selectedCurrencyCode, setSelectedCurrencyCode] = fromState;
	const [
		modalOpen,
		{ switchValue: switchModalOpen, setFalse: closeModal, setTrue: openModal },
	] = useBooleanState();
	const onSelectModalCurrencyCode = React.useCallback(
		(currencyCode: CurrencyCode) => {
			setSelectedCurrencyCode(currencyCode);
			closeModal();
		},
		[closeModal, setSelectedCurrencyCode],
	);
	const navigate = useNavigate();
	const back = React.useCallback(() => {
		navigate({
			to: "/debts/user/$id",
			params: { id: userId },
			replace: true,
		});
	}, [navigate, userId]);
	return (
		<>
			<PageHeader
				startContent={
					<BackLink to="/debts/user/$id/exchange" params={{ id: userId }} />
				}
			>
				<LoadableUser id={userId} />
			</PageHeader>
			<ExchangeDebtsGroup userId={userId} />
			<CurrenciesGroup
				userId={userId}
				selectedCurrencyCode={selectedCurrencyCode}
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
			{selectedCurrencyCode ? (
				<>
					<Divider />
					<PlannedDebts
						userId={userId}
						selectedCurrencyCode={selectedCurrencyCode}
						onDone={back}
					/>
				</>
			) : null}
		</>
	);
};
