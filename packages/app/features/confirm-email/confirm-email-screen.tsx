import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "#app/components/empty-card.tsx";
import { ErrorMessage } from "#app/components/error-message.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { useTrpcMutationOptions } from "#app/hooks/use-trpc-mutation-options.ts";
import type { TRPCMutationResult } from "#app/trpc.ts";
import { getPathHooks } from "#app/utils/navigation.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { ButtonLink } from "#components/link.tsx";
import { Spinner } from "#components/spinner.tsx";
import { Text } from "#components/text.tsx";
import { options as authConfirmEmailOptions } from "#mutations/auth/confirm-email.ts";

export const ConfirmEmail: React.FC<{
	confirmMutation: TRPCMutationResult<"auth.confirmEmail">;
	token: string;
}> = ({ confirmMutation, token }) => {
	const { t } = useTranslation("register");
	switch (confirmMutation.status) {
		case "pending":
			return <Spinner size="lg" />;
		case "error":
			return (
				<ErrorMessage
					message={confirmMutation.error.message}
					button={{
						text: t("confirm.retryButton"),
						onPress: () => confirmMutation.mutate({ token }),
					}}
				/>
			);
		case "idle":
			return null;
		case "success":
			return (
				<>
					<Text variant="h3">{confirmMutation.data.email}</Text>
					<Text variant="h4">{t("confirm.success.header")}</Text>
					<ButtonLink to="/" color="primary">
						{t("confirm.success.home")}
					</ButtonLink>
				</>
			);
	}
};

export const ConfirmEmailScreen = () => {
	const { useQueryState } = getPathHooks("/_public/confirm-email");
	const [token] = useQueryState("token");
	const { t } = useTranslation("register");
	const trpc = useTRPC();
	const confirmEmailMutation = useMutation(
		trpc.auth.confirmEmail.mutationOptions(
			useTrpcMutationOptions(authConfirmEmailOptions),
		),
	);
	const confirmEmail = React.useCallback(() => {
		if (!token || confirmEmailMutation.status !== "idle") {
			return;
		}
		confirmEmailMutation.mutate({ token });
	}, [token, confirmEmailMutation]);
	React.useEffect(confirmEmail, [confirmEmail]);

	return (
		<>
			<PageHeader>{t("confirm.header")}</PageHeader>
			{token ? (
				<ConfirmEmail confirmMutation={confirmEmailMutation} token={token} />
			) : (
				<EmptyCard title={t("confirm.error.title")}>
					<Text variant="h3" className="text-center">
						{t("confirm.error.description")}
					</Text>
				</EmptyCard>
			)}
		</>
	);
};
