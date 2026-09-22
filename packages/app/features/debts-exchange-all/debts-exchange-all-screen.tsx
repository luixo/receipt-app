import React from "react";

import { doNothing } from "remeda";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { LoadablePeer } from "~app/components/app/loadable-peer";
import { PageHeader } from "~app/components/page-header";
import { PeerDebtsGroup } from "~app/components/peer-debts-group";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import type { CurrencyCode } from "~app/utils/currency";
import { getPathHooks } from "~app/utils/navigation";
import { BackLink } from "~components/back-link";
import { Divider } from "~components/divider";

import { CurrenciesGroup } from "./currencies-group";
import { PlannedDebts } from "./planned-debts";

export const DebtsExchangeAllScreen = () => {
	const { useParams, useQueryState } = getPathHooks(
		"/_protected/debts/peer/$id/exchange/all",
	);
	const { id: peerId } = useParams();
	const fromState = useQueryState("from");
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
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const back = React.useCallback(() => {
		navigate({
			to: "/debts/peer/$id",
			params: { id: peerId },
			replace: true,
		});
	}, [navigate, peerId]);
	return (
		<>
			<PageHeader
				startContent={
					<BackLink to="/debts/peer/$id/exchange" params={{ id: peerId }} />
				}
				endContent={<LoadablePeer id={peerId} />}
			/>
			<PeerDebtsGroup className="self-center" peerId={peerId} />
			<CurrenciesGroup
				peerId={peerId}
				selectedCurrencyCode={selectedCurrencyCode}
				setSelectedCurrencyCode={setSelectedCurrencyCode}
				onSelectOther={openModal}
			/>
			<CurrenciesPicker
				selectedCurrencyCode={selectedCurrencyCode}
				onChange={onSelectModalCurrencyCode}
				modalOpen={modalOpen}
				switchModalOpen={switchModalOpen}
				// oxlint-disable-next-line typescript/strict-void-return
				onLoad={doNothing}
				topQueryOptions={{ type: "debts" }}
			/>
			{selectedCurrencyCode ? (
				<>
					<Divider />
					<PlannedDebts
						peerId={peerId}
						selectedCurrencyCode={selectedCurrencyCode}
						onDone={back}
					/>
				</>
			) : null}
		</>
	);
};
