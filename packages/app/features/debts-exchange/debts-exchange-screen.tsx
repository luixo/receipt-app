import { useTranslation } from "react-i18next";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { UserDebtsGroup } from "~app/components/user-debts-group";
import { getPathHooks } from "~app/utils/navigation";
import { BackLink } from "~components/back-link";
import { ButtonLink } from "~components/link";

export const DebtsExchangeScreen = () => {
	const { useParams } = getPathHooks("/_protected/debts/user/$id/exchange/");
	const { id: userId } = useParams();
	const { t } = useTranslation("debts");
	return (
		<>
			<PageHeader
				startContent={<BackLink to="/debts/user/$id" params={{ id: userId }} />}
				endContent={<LoadableUser id={userId} />}
			/>
			<UserDebtsGroup userId={userId} />
			<ButtonLink
				color="primary"
				to="/debts/user/$id/exchange/all"
				params={{ id: userId }}
				title={t("exchange.buttons.exchangeAll")}
			>
				{t("exchange.buttons.exchangeAll")}
			</ButtonLink>
			<ButtonLink
				color="primary"
				to="/debts/user/$id/exchange/specific"
				params={{ id: userId }}
				isDisabled
				title={t("exchange.buttons.exchangeSpecific")}
			>
				{t("exchange.buttons.exchangeSpecific")}
			</ButtonLink>
		</>
	);
};
