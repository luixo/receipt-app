import type React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { BackLink } from "~components/link";

import { AddReceipt } from "./add-receipt";

export const AddReceiptScreen: React.FC = () => {
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
