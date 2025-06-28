import React from "react";

import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useTRPC } from "~app/utils/trpc";
import { Badge } from "~components/badge";
import { AddIcon, DebtIcon, InboxIcon, TransferIcon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { Debts } from "./debts";
import { DebtsAggregated } from "./debts-aggregated";

export const DebtsScreen: React.FC<{
	limitState: SearchParamState<"/debts", "limit">;
	offsetState: SearchParamState<"/debts", "offset">;
}> = ({ limitState, offsetState }) => {
	const trpc = useTRPC();
	const settingsQuery = useQuery(trpc.accountSettings.get.queryOptions());
	const inboundDebtsAmount = useDebtsIntentions();
	const intentionsButton = React.useMemo(
		() => (
			<ButtonLink
				key="intentions"
				to="/debts/intentions"
				color="primary"
				title="Debts sync intentions"
				variant="bordered"
				isDisabled={inboundDebtsAmount === 0}
				isIconOnly
			>
				<InboxIcon size={24} />
			</ButtonLink>
		),
		[inboundDebtsAmount],
	);
	return (
		<>
			<PageHeader
				startContent={<DebtIcon size={36} />}
				aside={
					<>
						<ButtonLink
							to="/debts/transfer"
							color="primary"
							title="Transfer debts"
							variant="bordered"
							isIconOnly
						>
							<TransferIcon size={24} />
						</ButtonLink>
						<ButtonLink
							to="/debts/add"
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</ButtonLink>
						{inboundDebtsAmount === 0 ? (
							settingsQuery.data?.manualAcceptDebts ? (
								intentionsButton
							) : null
						) : (
							<Badge
								content={inboundDebtsAmount}
								color="danger"
								placement="top-right"
								size="lg"
							>
								{intentionsButton}
							</Badge>
						)}
					</>
				}
			>
				Debts
			</PageHeader>
			<EmailVerificationCard />
			<DebtsAggregated />
			<Debts limitState={limitState} offsetState={offsetState} />
		</>
	);
};
