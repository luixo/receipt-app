import React from "react";

import { Button } from "@nextui-org/react";
import { useRouter } from "solito/navigation";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import * as mutations from "~mutations";

type Props = {
	intentions: TRPCQueryOutput<"debts.getIntentions">;
};

export const AcceptAllIntentionsButton: React.FC<Props> = ({ intentions }) => {
	const router = useRouter();

	const acceptAllMutation = trpc.debts.acceptAllIntentions.useMutation(
		useTrpcMutationOptions(mutations.debts.acceptAllIntentions.options, {
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
