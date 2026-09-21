import { useTranslation } from "react-i18next";

import { AllDebtsGroup } from "~app/components/all-debts-group";
import { AmountBadge } from "~app/components/amount-badge";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getPathHooks } from "~app/utils/navigation";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { View } from "~components/view";

import { Debts } from "./debts";

export const DebtsScreen = () => {
	const { t } = useTranslation("debts");
	const { useQueryState, useDefaultedQueryState } =
		getPathHooks("/_protected/debts/");
	const limitState = useDefaultedQueryState("limit", useDefaultLimit());
	const offsetState = useQueryState("offset");
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
			<View className="items-center">
				<AllDebtsGroup className="px-12" />
				<View className="absolute right-0">
					<ShowResolvedDebtsOption />
				</View>
			</View>
			<Debts limitState={limitState} offsetState={offsetState} />
		</>
	);
};
