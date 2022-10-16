import React from "react";

import { Button, Card, Loading, Spacer, Text } from "@nextui-org/react";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";

export const EmailVerificationCard: React.FC = () => {
	const accountQuery = trpc.account.get.useQuery();
	const resendEmailMutation = trpc.account.resendEmail.useMutation(
		useTrpcMutationOptions(mutations.account.resendEmail.options)
	);
	const resendEmail = React.useCallback(
		() => resendEmailMutation.mutate(),
		[resendEmailMutation]
	);
	if (accountQuery.status !== "success" || accountQuery.data.account.verified) {
		return null;
	}
	return (
		<>
			<Spacer y={1} />
			<Card css={{ mw: 600, alignSelf: "center" }} variant="shadow">
				<Card.Header css={{ pb: 0 }}>
					<Text h3 color="warning">
						Your email is not verified!
					</Text>
				</Card.Header>
				<Card.Body>
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
							auto
							onClick={resendEmail}
							disabled={resendEmailMutation.isLoading}
						>
							{resendEmailMutation.isLoading ? <Loading /> : "Resend email"}
						</Button>
					)}
				</Card.Body>
			</Card>
		</>
	);
};
