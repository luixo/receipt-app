import React from "react";

import { Button, Card, Loading, Spacer, Text } from "@nextui-org/react";

import { MutationErrorMessage } from "app/components/mutation-error-message";
import { trpc } from "app/trpc";

export const EmailVerificationCard: React.FC = () => {
	const accountQuery = trpc.useQuery(["account.get"]);
	const resendEmailMutation = trpc.useMutation(["account.resend-email"]);
	const resendEmail = React.useCallback(
		() => resendEmailMutation.mutate(),
		[resendEmailMutation]
	);
	if (accountQuery.status !== "success" || accountQuery.data.verified) {
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
					{resendEmailMutation.status === "error" ? (
						<>
							<Spacer y={1} />
							<MutationErrorMessage mutation={resendEmailMutation} />
						</>
					) : null}
				</Card.Body>
			</Card>
		</>
	);
};
