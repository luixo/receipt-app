import React from "react";

import { Spacer, Text } from "@nextui-org/react";
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Divider,
} from "@nextui-org/react-tailwind";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";

export const EmailVerificationCard: React.FC = () => {
	const accountQuery = trpc.account.get.useQuery();
	const resendEmailMutation = trpc.account.resendEmail.useMutation(
		useTrpcMutationOptions(mutations.account.resendEmail.options),
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
					<Text h3 color="warning">
						Your email is not verified!
					</Text>
				</CardHeader>
				<Divider />
				<CardBody>
					<Text>
						Until you verify your email, you won&apos;t be able to use most of
						the app&apos;s features
					</Text>
					<Spacer y={1} />
					{resendEmailMutation.status === "success" ? (
						<Text h3>
							Email successfully sent to {resendEmailMutation.data.email}!
						</Text>
					) : (
						<Button
							color="primary"
							onClick={resendEmail}
							isDisabled={resendEmailMutation.isLoading}
							isLoading={resendEmailMutation.isLoading}
						>
							Resend email
						</Button>
					)}
				</CardBody>
			</Card>
	);
};
