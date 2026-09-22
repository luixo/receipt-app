import React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { TRPCMutationOutput } from "~app/trpc";
import { BackLink } from "~components/back-link";

import { AddPeerForm } from "./add-peer-form";

export const AddPeerScreen = () => {
	const { t } = useTranslation("peers");
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const onSuccess = React.useCallback<
		(response: TRPCMutationOutput<"peers.add">) => void
	>(
		({ id }) => navigate({ to: "/peers/$id", params: { id }, replace: true }),
		[navigate],
	);

	return (
		<>
			<PageHeader startContent={<BackLink to="/peers" />}>
				{t("add.header")}
			</PageHeader>
			<EmailVerificationCard />
			<AddPeerForm onSuccess={onSuccess} />
		</>
	);
};
