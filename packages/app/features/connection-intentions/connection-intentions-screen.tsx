import type React from "react";

import { ConnectionIntentions } from "~app/features/connection-intentions/connection-intentions";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";

export const ConnectionIntentionsScreen: React.FC = () => (
	<>
		<EmailVerificationCard />
		<ConnectionIntentions />
	</>
);
