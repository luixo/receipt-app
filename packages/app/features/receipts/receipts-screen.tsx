import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { AppPage } from "next-app/types/page";

import { Receipts } from "./receipts";

export const ReceiptsScreen: AppPage = () => (
	<>
		<Header
			icon="🧾"
			aside={
				<IconButton
					href="/receipts/add"
					title="Add receipt"
					bordered
					icon={<AddIcon size={24} />}
				/>
			}
		>
			Receipts
		</Header>
		<EmailVerificationCard />
		<Spacer y={1} />
		<Receipts />
	</>
);
