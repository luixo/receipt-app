import React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { TRPCMutationOutput } from "~app/trpc";
import { BackLink } from "~components/link";

import { AddUserForm } from "./add-user-form";

export const AddUserScreen: React.FC = () => {
	const { t } = useTranslation("users");
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const onSuccess = React.useCallback<
		(response: TRPCMutationOutput<"users.add">) => void
	>(
		({ id }) => navigate({ to: "/users/$id", params: { id }, replace: true }),
		[navigate],
	);

	return (
		<>
			<PageHeader startContent={<BackLink to="/users" />}>
				{t("add.header")}
			</PageHeader>
			<EmailVerificationCard />
			<AddUserForm onSuccess={onSuccess} />
		</>
	);
};
