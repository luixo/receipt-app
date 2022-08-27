import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { Badge } from "app/components/badge";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useDebtsSyncIntentions } from "app/hooks/use-debts-sync-intentions";
import { PageWithLayout } from "next-app/types/page";

import { Debts } from "./debts";

export const DebtsScreen: PageWithLayout = () => {
	const inboundDebtsAmount = useDebtsSyncIntentions();
	return (
		<>
			<Header
				icon="💸"
				aside={React.useMemo(
					() => [
						<IconButton
							key="add"
							href="/debts/add"
							title="Add debt"
							bordered
							icon={<AddIcon size={24} />}
						/>,
						<Badge amount={inboundDebtsAmount} key="intentions">
							<IconButton
								href="/debts/intentions"
								title="Debts sync intentions"
								bordered
								icon={<LinkIcon size={24} />}
							/>
						</Badge>,
					],
					[inboundDebtsAmount]
				)}
			>
				Debts
			</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<Debts />
		</>
	);
};
