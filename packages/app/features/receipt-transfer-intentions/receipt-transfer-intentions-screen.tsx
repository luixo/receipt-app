import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { AppPage } from "~utils/next";

import { ReceiptTransferIntentions } from "./receipt-transfer-intentions";

export const ReceiptTransferIntentionsScreen: AppPage = () => (
	<>
		<PageHeader backHref="/receipts">Receipt transfer intentions</PageHeader>
		<EmailVerificationCard />
		<ReceiptTransferIntentions />
	</>
);
