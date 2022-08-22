import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { PageWithLayout } from "next-app/types/page";

import { Debts } from "./debts";

export const DebtsScreen: PageWithLayout = () => (
	<>
		<Header
			icon="💸"
			aside={
				<IconButton
					href="/debts/add"
					title="Add debt"
					disabled
					bordered
					icon={<AddIcon size={24} />}
				/>
			}
		>
			Debts
		</Header>
		<EmailVerificationCard />
		<Spacer y={1} />
		<Debts />
	</>
);
