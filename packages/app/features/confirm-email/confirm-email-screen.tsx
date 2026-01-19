import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { ErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Link } from "~components/link";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { options as authConfirmEmailOptions } from "~mutations/auth/confirm-email";

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
					<Link to="/">
						<Button color="primary">{t("confirm.success.home")}</Button>
					</Link>
				</>
			);
	}
};

export const ConfirmEmailScreen: React.FC<{
	token?: string;
}> = ({ token }) => {
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
