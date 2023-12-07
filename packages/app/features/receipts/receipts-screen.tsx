import React from "react";

import { Button, Link, Spacer } from "@nextui-org/react-tailwind";
import {
	MdAdd as AddIcon,
	MdOutlineReceipt as ReceiptIcon,
} from "react-icons/md";

import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import type { AppPage } from "next-app/types/page";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen: AppPage = () => (
	<>
		<Header
			startContent={<ReceiptIcon size={36} />}
			aside={
				<>
					<FilterButton />
					<Spacer x={4} />
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
				</>
			}
		>
			Receipts
		</Header>
		<EmailVerificationCard />
		<Spacer y={4} />
		<Receipts />
	</>
);
