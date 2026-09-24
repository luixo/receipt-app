import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Text } from "~components/text";
import { options as userResendEmailOptions } from "~mutations/user/resend-email";

export const EmailVerificationCard = suspendedFallback(
	() => {
		const { t } = useTranslation();
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(trpc.user.get.queryOptions());
		const resendEmailMutation = useMutation(
			trpc.user.resendEmail.mutationOptions(
				useTrpcMutationOptions(userResendEmailOptions),
			),
		);
		const resendEmail = React.useCallback(
			() => resendEmailMutation.mutate(),
			[resendEmailMutation],
		);
		if (user.user.verified) {
			return null;
		}
		return (
			<Card
				className="min-w-fit self-center"
				testID="email-verification-card"
				header={
					<Text className="text-warning text-center text-2xl">
						{t("components.emailVerification.header")}
					</Text>
				}
				bodyClassName="gap-4"
			>
				<Text>{t("components.emailVerification.text")}</Text>
				{resendEmailMutation.status === "success" ? (
					<Text className="text-center text-2xl">
						{t("components.emailVerification.success", {
							email: resendEmailMutation.data.email,
						})}
					</Text>
				) : (
					<Button
						color="primary"
						onPress={resendEmail}
						isDisabled={resendEmailMutation.isPending}
						isLoading={resendEmailMutation.isPending}
					>
						{t("components.emailVerification.resendButton")}
					</Button>
				)}
			</Card>
		);
	},
	() => null,
);
