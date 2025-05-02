import React from "react";

import { BackLink, PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useNavigate } from "~app/hooks/use-navigation";
import type { TRPCMutationOutput } from "~app/trpc";

import { AddUserForm } from "./add-user-form";

export const AddUserScreen: React.FC = () => {
	const navigate = useNavigate();

	const onSuccess = React.useCallback<
		(response: TRPCMutationOutput<"users.add">) => void
	>(
		({ id }) => navigate({ to: "/users/$id", replace: true, params: { id } }),
		[navigate],
	);

	return (
		<>
			<PageHeader startContent={<BackLink to="/users" />}>Add user</PageHeader>
			<EmailVerificationCard />
			<AddUserForm onSuccess={onSuccess} />
		</>
	);
};
