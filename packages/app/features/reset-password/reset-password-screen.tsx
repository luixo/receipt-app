import React from "react";

import { useSearchParams } from "solito/navigation";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import type { AppPage } from "~utils/next";

import { ResetPassword } from "./reset-password";

export const ResetPasswordScreen: AppPage = () => {
	const searchParams = useSearchParams<{ token: string }>();
	const token = searchParams?.get("token") ?? undefined;

	return (
		<>
			<PageHeader>Reset password</PageHeader>
			{token ? (
				<ResetPassword token={token} />
			) : (
				<EmptyCard title="Something went wrong">
					Please verify you got reset link right or request a new one
				</EmptyCard>
			)}
		</>
	);
};
