import React from "react";

import { useMutation } from "@tanstack/react-query";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { options as authConfirmEmailOptions } from "~mutations/auth/confirm-email";

import { ConfirmEmail } from "./confirm-email";

export const ConfirmEmailScreen: React.FC<{
	token?: string;
}> = ({ token }) => {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const confirmEmailMutation = useMutation(
		trpc.auth.confirmEmail.mutationOptions(
			useTrpcMutationOptions(authConfirmEmailOptions, {
				onSuccess: () => navigate({ to: "/", replace: true }),
			}),
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
