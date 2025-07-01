import type React from "react";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTRPC } from "~app/utils/trpc";
import { BackLink } from "~components/link";
import { Spinner } from "~components/spinner";

import { AddReceipt } from "./add-receipt";

export const AddReceiptScreen: React.FC = () => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const selfAccountId = useQuery(trpc.account.get.queryOptions()).data?.account
		.id;

	return (
		<>
			<PageHeader startContent={<BackLink to="/receipts" />}>
				{t("add.header")}
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
