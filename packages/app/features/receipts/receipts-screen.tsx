import React from "react";

import { Button, Link, Spacer } from "@nextui-org/react-tailwind";
import {
	MdAdd as AddIcon,
	MdOutlineReceipt as ReceiptIcon,
} from "react-icons/md";

import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import type { AppPage } from "next-app/types/page";

import { Receipts } from "./receipts";

export const ReceiptsScreen: AppPage = () => (
	<>
		<Header
			icon={<ReceiptIcon size={36} />}
			aside={
				<Button
					color="primary"
					href="/receipts/add"
					as={Link}
					title="Add receipt"
					variant="bordered"
					isIconOnly
				>
					<AddIcon size={24} />
				</Button>
			}
		>
			Receipts
		</Header>
		<EmailVerificationCard />
		<Spacer y={4} />
		<Receipts />
	</>
);
