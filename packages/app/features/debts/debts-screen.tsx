import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { trpc } from "~app/trpc";
import { Badge } from "~components/badge";
import { Button } from "~components/button";
import { AddIcon, DebtIcon, InboxIcon, TransferIcon } from "~components/icons";
import { Link } from "~components/link";
import type { AppPage } from "~utils/next";

import { Debts } from "./debts";

export const DebtsScreen: AppPage = () => {
	const settingsQuery = trpc.accountSettings.get.useQuery();
	const inboundDebtsAmount = useDebtsIntentions();
	const intentionsButton = React.useMemo(
		() => (
			<Button
				key="intentions"
				href="/debts/intentions"
				as={Link}
				color="primary"
				title="Debts sync intentions"
				variant="bordered"
				isDisabled={inboundDebtsAmount === 0}
				isIconOnly
			>
				<InboxIcon size={24} />
			</Button>
		),
		[inboundDebtsAmount],
	);
	return (
		<>
			<PageHeader
				startContent={<DebtIcon size={36} />}
				aside={
					<>
						<Button
							href="/debts/transfer"
							as={Link}
							color="primary"
							title="Transfer debts"
							variant="bordered"
							isIconOnly
						>
							<TransferIcon size={24} />
						</Button>
						<Button
							href="/debts/add"
							as={Link}
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</Button>
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
			<Debts />
		</>
	);
};
