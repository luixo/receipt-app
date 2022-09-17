import React from "react";

import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { AppPage } from "next-app/types/page";

import { DebtIntentions } from "./debts-intentions";

export const DebtsIntentionsScreen: AppPage = () => (
	<>
		<EmailVerificationCard />
		<DebtIntentions />
	</>
);
