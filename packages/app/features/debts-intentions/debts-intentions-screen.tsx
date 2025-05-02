import type React from "react";

import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";

import { DebtIntentions } from "./debts-intentions";

export const DebtsIntentionsScreen: React.FC = () => (
	<>
		<EmailVerificationCard />
		<DebtIntentions />
	</>
);
