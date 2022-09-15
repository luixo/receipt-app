import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Header } from "app/components/header";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { ConfirmEmail } from "./confirm-email";

const { useParam } = createParam<{ token: string }>();

export const ConfirmEmailScreen: PageWithLayout = () => {
	const [token] = useParam("token");
	const confirmEmailMutation = trpc.auth.confirmEmail.useMutation(
		useTrpcMutationOptions(mutations.auth.confirmEmail.options)
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
			<Header>Confirm email</Header>
			<Spacer y={1} />
			<ConfirmEmail token={token} confirmMutation={confirmEmailMutation} />
		</>
	);
};
