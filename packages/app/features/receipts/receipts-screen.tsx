import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useReceiptTransfersIntentions } from "~app/hooks/use-receipt-transfer-intentions";
import { Badge } from "~components/badge";
import { Button } from "~components/button";
import { AddIcon, InboxIcon, ReceiptIcon } from "~components/icons";
import { Link } from "~components/link";
import type { AppPage } from "~utils/next";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen: AppPage = () => {
	const transferIntentionsAmount = useReceiptTransfersIntentions();
	const tranferIntentionsButton = React.useMemo(
		() => (
			<Button
				key="transfer-intentions"
				href="/receipts/transfer-intentions"
				as={Link}
				color="primary"
				title="Receipt transfer intentions"
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
						{transferIntentionsAmount === 0 ? (
							tranferIntentionsButton
						) : (
							<Badge
								content={transferIntentionsAmount}
								color="danger"
								placement="top-right"
								size="lg"
							>
								{tranferIntentionsButton}
							</Badge>
						)}
					</>
				}
			>
				Receipts
			</PageHeader>
			<EmailVerificationCard />
			<Receipts />
		</>
	);
};
