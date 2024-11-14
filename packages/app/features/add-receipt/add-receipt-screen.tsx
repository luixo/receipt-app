import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { trpc } from "~app/trpc";
import { Spinner } from "~components/spinner";
import type { AppPage } from "~utils/next";

import { AddReceipt } from "./add-receipt";

export const AddReceiptScreen: AppPage = () => {
	const selfAccountId = trpc.account.get.useQuery().data?.account.id;

	return (
		<>
			<PageHeader backHref="/receipts">Add receipt</PageHeader>
			<EmailVerificationCard />
			{selfAccountId ? (
				<AddReceipt selfAccountId={selfAccountId} />
			) : (
				<Spinner size="lg" />
			)}
		</>
	);
};
