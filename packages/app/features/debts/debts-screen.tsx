import React from "react";

import { Badge, Button, Link } from "@nextui-org/react";
import { IoMdMail as InboxIcon } from "react-icons/io";
import { MdAdd as AddIcon } from "react-icons/md";
import { PiMoney as DebtIcon } from "react-icons/pi";

import { PageHeader } from "app/components/page-header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "app/hooks/use-debts-intentions";
import type { AppPage } from "next-app/types/page";

import { Debts } from "./debts";

export const DebtsScreen: AppPage = () => {
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
				isIconOnly
			>
				<InboxIcon size={24} />
			</Button>
		),
		[],
	);
	return (
		<>
			<PageHeader
				startContent={<DebtIcon size={36} />}
				aside={
					<>
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
							intentionsButton
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
