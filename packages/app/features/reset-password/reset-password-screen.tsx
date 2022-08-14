import React from "react";

import { createParam } from "solito";

import { Header } from "app/components/header";
import { Page } from "app/components/page";
import { trpc } from "app/trpc";

import { ResetPassword } from "./reset-password";

const { useParam } = createParam<{ token: string }>();

export const ResetPasswordScreen: React.FC = () => {
	const [token] = useParam("token");
	const resetPasswordIntentionQuery = trpc.useQuery(
		["reset-password-intentions.get", { token: token! }],
		{ enabled: Boolean(token) }
	);

	return (
		<Page>
			<Header>Reset password</Header>
			<ResetPassword
				token={token}
				intentionQuery={resetPasswordIntentionQuery}
			/>
		</Page>
	);
};
