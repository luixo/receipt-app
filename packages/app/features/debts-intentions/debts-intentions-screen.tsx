import React from "react";

import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { AppPage } from "~utils/next";

import { DebtIntentions } from "./debts-intentions";

export const DebtsIntentionsScreen: AppPage = () => (
	<>
		<EmailVerificationCard />
		<DebtIntentions />
	</>
);
