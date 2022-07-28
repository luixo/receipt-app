import React from "react";

import { Spacer, Text } from "@nextui-org/react";
import { createParam } from "solito";

import { cache } from "app/cache";
import { Page } from "app/components/page";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc } from "app/trpc";

import { ConfirmEmail } from "./confirm-email";

const { useParam } = createParam<{ token: string }>();

export const ConfirmEmailScreen: React.FC = () => {
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
		[token, confirmEmailMutation]
	);
	React.useEffect(confirmEmail, [confirmEmail]);

	return (
		<Page>
			<Text h2>Confirm email</Text>
			<Spacer y={1} />
			<ConfirmEmail token={token} confirmMutation={confirmEmailMutation} />
		</Page>
	);
};
