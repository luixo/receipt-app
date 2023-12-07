import React from "react";

import { Spacer } from "@nextui-org/react";
import { Button, Link } from "@nextui-org/react-tailwind";
import { IoMdMail as InboxIcon } from "react-icons/io";
import { MdAdd as AddIcon } from "react-icons/md";
import { PiMoney as DebtIcon } from "react-icons/pi";

import { Badge } from "app/components/badge";
import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useDebtsIntentions } from "app/hooks/use-debts-intentions";
import type { AppPage } from "next-app/types/page";

import { Debts } from "./debts";

export const DebtsScreen: AppPage = () => {
	const inboundDebtsAmount = useDebtsIntentions();
	return (
		<>
			<Header
				icon={<DebtIcon size={36} />}
				aside={React.useMemo(
					() => [
						<Button
							key="add"
							href="/debts/add"
							as={Link}
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</Button>,
						<Badge amount={inboundDebtsAmount} key="intentions">
							<Button
								href="/debts/intentions"
								as={Link}
								color="primary"
								title="Debts sync intentions"
								variant="bordered"
								isIconOnly
							>
								<InboxIcon size={24} />
							</Button>
						</Badge>,
					],
					[inboundDebtsAmount],
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
