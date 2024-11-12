import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { Button } from "~components/button";
import { AddIcon, ReceiptIcon } from "~components/icons";
import { Link } from "~components/link";
import type { AppPage } from "~utils/next";

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
