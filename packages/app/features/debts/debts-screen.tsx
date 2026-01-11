import type React from "react";

import { useTranslation } from "react-i18next";

import { AmountBadge } from "~app/components/amount-badge";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import type { SearchParamState } from "~app/utils/navigation";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { Debts } from "./debts";
import { DebtsAggregated } from "./debts-aggregated";

export const DebtsScreen: React.FC<{
	limitState: SearchParamState<"/debts", "limit">;
	offsetState: SearchParamState<"/debts", "offset">;
}> = ({ limitState, offsetState }) => {
	const { t } = useTranslation("debts");
	return (
		<>
			<PageHeader
				startContent={<Icon name="money" className="size-9" />}
				aside={
					<>
						<ButtonLink
							to="/debts/transfer"
							color="primary"
							title={t("list.buttons.transfer")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="transfer" className="size-6" />
						</ButtonLink>
						<ButtonLink
							to="/debts/add"
							color="primary"
							title={t("list.buttons.add")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
						<AmountBadge useAmount={useDebtsIntentions}>
							{({ amount }) => (
								<ButtonLink
									key="intentions"
									to="/debts/intentions"
									color="primary"
									title={t("list.buttons.intentions")}
									variant="bordered"
									isDisabled={amount === 0}
									isIconOnly
								>
									<Icon name="inbox" className="size-6" />
								</ButtonLink>
							)}
						</AmountBadge>
					</>
				}
			>
				{t("list.title")}
			</PageHeader>
			<EmailVerificationCard />
			<DebtsAggregated />
			<Debts limitState={limitState} offsetState={offsetState} />
		</>
	);
};
