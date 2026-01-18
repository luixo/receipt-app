import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";
import { BackLink, ButtonLink } from "~components/link";
import type { UserId } from "~db/ids";

const ExchangeDebtsGroup = suspendedFallback<{ userId: UserId }>(
	({ userId }) => {
		const trpc = useTRPC();
		const [showResolvedDebts] = useShowResolvedDebts();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		return (
			<DebtsGroup
				debts={
					showResolvedDebts
						? debts
						: debts.filter((element) => element.sum !== 0)
				}
			/>
		);
	},
	<DebtsGroupSkeleton amount={3} />,
);

export const DebtsExchangeScreen: React.FC<{ userId: UserId }> = ({
	userId,
}) => {
	const { t } = useTranslation("debts");
	return (
		<>
			<PageHeader
				startContent={<BackLink to="/debts/user/$id" params={{ id: userId }} />}
				endContent={<LoadableUser id={userId} />}
			/>
			<ExchangeDebtsGroup userId={userId} />
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
