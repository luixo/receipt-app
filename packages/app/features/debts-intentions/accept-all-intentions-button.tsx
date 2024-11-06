import React from "react";

import { useRouter } from "solito/navigation";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { options as debtsAcceptIntentionOptions } from "~mutations/debts/accept-intention";

type Props = {
	intentions: TRPCQueryOutput<"debtIntentions.getAll">;
};

export const AcceptAllIntentionsButton: React.FC<Props> = ({ intentions }) => {
	const router = useRouter();

	const acceptMutations = intentions.map((intention) =>
		trpc.debtIntentions.accept.useMutation(
			// Intentions are stable due to `key` based on intention id in the upper component
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(debtsAcceptIntentionOptions, {
				context: intention,
			}),
		),
	);
	const acceptAllIntentions = React.useCallback(async () => {
		try {
			await Promise.all(
				acceptMutations.map((mutation, index) =>
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					mutation.mutateAsync({ id: intentions[index]!.id }),
				),
			);
			router.push("/debts");
		} catch {
			/* empty */
		}
	}, [acceptMutations, intentions, router]);

	return (
		<Button
			color="primary"
			onClick={() => acceptAllIntentions()}
			title="Accept all incoming intentions"
		>
			Accept all intentions
		</Button>
	);
};
