import React from "react";

import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import type { AppPage } from "next-app/types/page";

export const ConnectionIntentionsScreen: AppPage = () => (
	<>
		<EmailVerificationCard />
		<ConnectionIntentions />
	</>
);
