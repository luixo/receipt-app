import { useTranslation } from "react-i18next";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { PageHeader } from "~app/components/page-header";
import { PeerDebtsGroup } from "~app/components/peer-debts-group";
import { getPathHooks } from "~app/utils/navigation";
import { BackLink } from "~components/back-link";
import { ButtonLink } from "~components/link";

export const DebtsExchangeScreen = () => {
	const { useParams } = getPathHooks("/_protected/debts/peer/$id/exchange/");
	const { id: peerId } = useParams();
	const { t } = useTranslation("debts");
	return (
		<>
			<PageHeader
				startContent={<BackLink to="/debts/peer/$id" params={{ id: peerId }} />}
				endContent={<LoadablePeer id={peerId} />}
			/>
			<PeerDebtsGroup peerId={peerId} />
			<ButtonLink
				color="primary"
				to="/debts/peer/$id/exchange/all"
				params={{ id: peerId }}
				title={t("exchange.buttons.exchangeAll")}
			>
				{t("exchange.buttons.exchangeAll")}
			</ButtonLink>
			<ButtonLink
				color="primary"
				to="/debts/peer/$id/exchange/specific"
				params={{ id: peerId }}
				isDisabled
				title={t("exchange.buttons.exchangeSpecific")}
			>
				{t("exchange.buttons.exchangeSpecific")}
			</ButtonLink>
		</>
	);
};
