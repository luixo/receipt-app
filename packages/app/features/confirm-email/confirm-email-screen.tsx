import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { cache } from "app/cache";
import { Header } from "app/components/header";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { ConfirmEmail } from "./confirm-email";

const { useParam } = createParam<{ token: string }>();

export const ConfirmEmailScreen: PageWithLayout = () => {
	const [token] = useParam("token");
	const confirmEmailMutation = trpc.useMutation(["auth.confirm-email"]);
	const trpcContext = trpc.useContext();
	const confirmEmail = useAsyncCallback(
		async (isMount) => {
			if (!token || confirmEmailMutation.status !== "idle") {
				return;
			}
			await confirmEmailMutation.mutateAsync({ token });
			if (!isMount()) {
				return;
			}
			cache.account.get.update(trpcContext, (account) => ({
				...account,
				verified: true,
			}));
		},
		[token, confirmEmailMutation, trpcContext]
	);
	React.useEffect(confirmEmail, [confirmEmail]);

	return (
		<>
			<Header>Confirm email</Header>
			<Spacer y={1} />
			<ConfirmEmail token={token} confirmMutation={confirmEmailMutation} />
		</>
	);
};
