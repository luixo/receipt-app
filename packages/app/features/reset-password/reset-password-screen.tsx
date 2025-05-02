import type React from "react";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";

import { ResetPassword } from "./reset-password";

export const ResetPasswordScreen: React.FC<{
	token?: string;
}> = ({ token }) => (
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
