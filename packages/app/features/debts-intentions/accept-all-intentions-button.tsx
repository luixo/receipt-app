import React from "react";

import { useRouter } from "solito/navigation";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { options as debtsAcceptAllIntentionsOptions } from "~mutations/debts/accept-all-intentions";

type Props = {
	intentions: TRPCQueryOutput<"debtIntentions.getAll">;
};

export const AcceptAllIntentionsButton: React.FC<Props> = ({ intentions }) => {
	const router = useRouter();

	const acceptAllMutation = trpc.debtIntentions.acceptAll.useMutation(
		useTrpcMutationOptions(debtsAcceptAllIntentionsOptions, {
			context: intentions,
		}),
	);
	const acceptAllIntentions = React.useCallback(() => {
		acceptAllMutation.mutate(undefined, {
			onSuccess: () => router.push("/debts"),
		});
	}, [acceptAllMutation, router]);

	return (
		<Button
			color="primary"
			isDisabled={acceptAllMutation.isPending}
			isLoading={acceptAllMutation.isPending}
			onClick={() => acceptAllIntentions()}
			title="Accept all incoming intentions"
		>
			Accept all intentions
		</Button>
	);
};
