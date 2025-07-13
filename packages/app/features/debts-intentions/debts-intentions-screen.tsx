import type React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";

import { DebtIntentions } from "./debts-intentions";

export const DebtsIntentionsScreen: React.FC = () => {
	const { t } = useTranslation("debts");
	return (
		<>
			<EmailVerificationCard />
			<PageHeader>{t("intentions.title")}</PageHeader>
			<DebtIntentions />
		</>
	);
};
