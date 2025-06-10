import React from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card, CardBody, CardHeader } from "~components/card";
import { Divider } from "~components/divider";
import { Text } from "~components/text";
import { options as accountResendEmailOptions } from "~mutations/account/resend-email";

export const EmailVerificationCard: React.FC = () => {
	const trpc = useTRPC();
	const accountQuery = useQuery(trpc.account.get.queryOptions());
	const resendEmailMutation = useMutation(
		trpc.account.resendEmail.mutationOptions(
			useTrpcMutationOptions(accountResendEmailOptions),
		),
	);
	const resendEmail = React.useCallback(
		() => resendEmailMutation.mutate(),
		[resendEmailMutation],
	);
	if (accountQuery.status !== "success" || accountQuery.data.account.verified) {
		return null;
	}
	return (
		<Card className="min-w-fit self-center" shadow="md">
			<CardHeader>
				<Text className="text-warning text-center text-2xl">
					Your email is not verified!
				</Text>
			</CardHeader>
			<Divider />
			<CardBody className="gap-4">
				<Text>
					Until you verify your email, you won&apos;t be able to use most of the
					app&apos;s features
				</Text>
				{resendEmailMutation.status === "success" ? (
					<Text className="text-center text-2xl">
						Email successfully sent to {resendEmailMutation.data.email}!
					</Text>
				) : (
					<Button
						color="primary"
						onPress={resendEmail}
						isDisabled={resendEmailMutation.isPending}
						isLoading={resendEmailMutation.isPending}
					>
						Resend email
					</Button>
				)}
			</CardBody>
		</Card>
	);
};
