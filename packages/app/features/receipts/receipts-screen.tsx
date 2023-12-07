import React from "react";

import { Button, Link } from "@nextui-org/react-tailwind";
import {
	MdAdd as AddIcon,
	MdOutlineReceipt as ReceiptIcon,
} from "react-icons/md";

import { PageHeader } from "app/components/page-header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import type { AppPage } from "next-app/types/page";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen: AppPage = () => (
	<>
		<PageHeader
			startContent={<ReceiptIcon size={36} />}
			aside={
				<>
					<FilterButton />
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
		</PageHeader>
		<EmailVerificationCard />
		<Receipts />
	</>
);
