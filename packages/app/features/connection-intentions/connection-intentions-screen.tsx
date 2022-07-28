import React from "react";

import { Page } from "app/components/page";
import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";

export const ConnectionIntentionsScreen: React.FC = () => (
	<Page>
		<EmailVerificationCard />
		<ConnectionIntentions />
	</Page>
);
