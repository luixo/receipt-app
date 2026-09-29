import type React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "#app/components/page-header.tsx";
import { EmailVerificationCard } from "#app/features/email-verification/email-verification-card.tsx";
import { BackLink } from "#components/back-link.tsx";

import { AddReceipt } from "./add-receipt";

export const AddReceiptScreen = () => {
	const { t } = useTranslation("receipts");

	return (
		<>
			<PageHeader startContent={<BackLink to="/receipts" />}>
				{t("add.header")}
			</PageHeader>
			<EmailVerificationCard />
			<AddReceipt />
		</>
	);
};
