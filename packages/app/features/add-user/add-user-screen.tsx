import React from "react";

import { useRouter } from "solito/navigation";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { TRPCMutationOutput } from "~app/trpc";
import type { AppPage } from "~utils/next";

import { AddUserForm } from "./add-user-form";

export const AddUserScreen: AppPage = () => {
	const router = useRouter();

	const onSuccess = React.useCallback<
		(response: TRPCMutationOutput<"users.add">) => void
	>(({ id }) => router.replace(`/users/${id}`), [router]);

	return (
		<>
			<PageHeader backHref="/users">Add user</PageHeader>
			<EmailVerificationCard />
			<AddUserForm onSuccess={onSuccess} />
		</>
	);
};
