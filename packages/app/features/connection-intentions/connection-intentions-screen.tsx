import React from "react";

import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { PageWithLayout } from "next-app/types/page";

export const ConnectionIntentionsScreen: PageWithLayout = () => (
	<>
		<EmailVerificationCard />
		<ConnectionIntentions />
	</>
);
