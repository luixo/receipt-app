import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "~app/hooks/use-debts-intentions";
import { trpc } from "~app/trpc";
import { Badge } from "~components/badge";
import { Button } from "~components/button";
import { AddIcon, DebtIcon, InboxIcon, TransferIcon } from "~components/icons";
import { Link } from "~components/link";

import { Debts } from "./debts";

export const DebtsScreen: React.FC = () => {
	const settingsQuery = trpc.accountSettings.get.useQuery();
	const inboundDebtsAmount = useDebtsIntentions();
	const intentionsButton = React.useMemo(
		() => (
			<Button
				key="intentions"
				to="/debts/intentions"
				as={Link<"/debts/intentions">}
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
							to="/debts/transfer"
							as={Link<"/debts/transfer">}
							color="primary"
							title="Transfer debts"
							variant="bordered"
							isIconOnly
						>
							<TransferIcon size={24} />
						</Button>
						<Button
							to="/debts/add"
							as={Link<"/debts/add">}
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
