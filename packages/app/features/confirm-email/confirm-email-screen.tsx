import React from "react";

import { useRouter, useSearchParams } from "solito/navigation";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { options as authConfirmEmailOptions } from "~mutations/auth/confirm-email";
import type { AppPage } from "~utils/next";

import { ConfirmEmail } from "./confirm-email";

export const ConfirmEmailScreen: AppPage = () => {
	const router = useRouter();
	const searchParams = useSearchParams<{ token: string }>();
	const token = searchParams?.get("token") ?? undefined;
	const confirmEmailMutation = trpc.auth.confirmEmail.useMutation(
		useTrpcMutationOptions(authConfirmEmailOptions, {
			onSuccess: () => router.replace("/"),
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
