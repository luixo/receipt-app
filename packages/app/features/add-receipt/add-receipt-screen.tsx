import type React from "react";

import { BackLink, PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { trpc } from "~app/trpc";
import { Spinner } from "~components/spinner";

import { AddReceipt } from "./add-receipt";

export const AddReceiptScreen: React.FC = () => {
	const selfAccountId = trpc.account.get.useQuery().data?.account.id;

	return (
		<>
			<PageHeader startContent={<BackLink to="/receipts" />}>
				Add receipt
			</PageHeader>
			<EmailVerificationCard />
			{selfAccountId ? (
				<AddReceipt selfAccountId={selfAccountId} />
			) : (
				<Spinner size="lg" />
			)}
		</>
	);
};
