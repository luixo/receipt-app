import React from "react";

import { createParam } from "solito";

import { PageHeader } from "app/components/page-header";
import { trpc } from "app/trpc";
import type { AppPage } from "next-app/types/page";

import { ResetPassword } from "./reset-password";

const { useParam } = createParam<{ token: string }>();

export const ResetPasswordScreen: AppPage = () => {
	const [token] = useParam("token");
	const resetPasswordIntentionQuery = trpc.resetPasswordIntentions.get.useQuery(
		{ token: token! },
		{ enabled: Boolean(token) },
	);

	return (
		<>
			<PageHeader>Reset password</PageHeader>
			<ResetPassword
				token={token}
				intentionQuery={resetPasswordIntentionQuery}
			/>
		</>
	);
};
