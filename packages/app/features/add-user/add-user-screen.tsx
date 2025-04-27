import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useNavigate } from "~app/hooks/use-navigation";
import type { TRPCMutationOutput } from "~app/trpc";
import type { AppPage } from "~utils/next";

import { AddUserForm } from "./add-user-form";

export const AddUserScreen: AppPage = () => {
	const navigate = useNavigate();

	const onSuccess = React.useCallback<
		(response: TRPCMutationOutput<"users.add">) => void
	>(({ id }) => navigate(`/users/${id}`, { replace: true }), [navigate]);

	return (
		<>
			<PageHeader backHref="/users">Add user</PageHeader>
			<EmailVerificationCard />
			<AddUserForm onSuccess={onSuccess} />
		</>
	);
};
