import React from "react";

import { createParam } from "solito";

import { Header } from "app/components/header";
import { trpc } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { ResetPassword } from "./reset-password";

const { useParam } = createParam<{ token: string }>();

export const ResetPasswordScreen: PageWithLayout = () => {
	const [token] = useParam("token");
	const resetPasswordIntentionQuery = trpc.useQuery(
		["resetPasswordIntentions.get", { token: token! }],
		{ enabled: Boolean(token) }
	);

	return (
		<>
			<Header>Reset password</Header>
			<ResetPassword
				token={token}
				intentionQuery={resetPasswordIntentionQuery}
			/>
		</>
	);
};
