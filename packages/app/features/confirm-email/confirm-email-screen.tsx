import React from "react";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { options as authConfirmEmailOptions } from "~mutations/auth/confirm-email";

import { ConfirmEmail } from "./confirm-email";

export const ConfirmEmailScreen: React.FC<{
	token?: string;
}> = ({ token }) => {
	const navigate = useNavigate();
	const confirmEmailMutation = trpc.auth.confirmEmail.useMutation(
		useTrpcMutationOptions(authConfirmEmailOptions, {
			onSuccess: () => navigate({ to: "/", replace: true }),
		}),
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
			<PageHeader>Confirm email</PageHeader>
			{token ? (
				<ConfirmEmail confirmMutation={confirmEmailMutation} />
			) : (
				<EmptyCard title="Something went wrong">
					Please verify you got confirm link right
				</EmptyCard>
			)}
		</>
	);
};
