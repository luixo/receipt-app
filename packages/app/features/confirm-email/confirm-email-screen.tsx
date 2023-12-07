import React from "react";

import { createParam } from "solito";

import { PageHeader } from "app/components/page-header";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { AppPage } from "next-app/types/page";

import { ConfirmEmail } from "./confirm-email";

const { useParam } = createParam<{ token: string }>();

export const ConfirmEmailScreen: AppPage = () => {
	const router = useRouter();
	const [token] = useParam("token");
	const confirmEmailMutation = trpc.auth.confirmEmail.useMutation(
		useTrpcMutationOptions(mutations.auth.confirmEmail.options, {
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
			<ConfirmEmail token={token} confirmMutation={confirmEmailMutation} />
		</>
	);
};
