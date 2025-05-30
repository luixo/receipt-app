import React from "react";

import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

type Props = {
	intentions: TRPCQueryOutput<"debtIntentions.getAll">;
} & React.ComponentProps<typeof Button>;

export const AcceptAllIntentionsButton: React.FC<Props> = ({
	intentions,
	...props
}) => {
	const navigate = useNavigate();

	const acceptMutations = intentions.map((intention) =>
		trpc.debtIntentions.accept.useMutation(
			// Intentions are stable due to `key` based on intention id in the upper component
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(acceptDebtIntentionOptions, {
				context: { intention },
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
			navigate({ to: "/debts" });
		} catch {
			/* empty */
		}
	}, [acceptMutations, intentions, navigate]);

	return (
		<Button
			color="primary"
			onPress={() => acceptAllIntentions()}
			title="Accept all incoming intentions"
			{...props}
		>
			Accept all intentions
		</Button>
	);
};
