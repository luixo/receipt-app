import React from "react";

import { useSearchParams } from "solito/navigation";

import { PageHeader } from "~app/components/page-header";
import { trpc } from "~app/trpc";
import type { AppPage } from "~web/types/page";

import { ResetPassword } from "./reset-password";

export const ResetPasswordScreen: AppPage = () => {
	const searchParams = useSearchParams<{ token: string }>();
	const token = searchParams?.get("token") ?? undefined;
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
