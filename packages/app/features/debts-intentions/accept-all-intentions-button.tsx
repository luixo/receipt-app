import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

type Props = {
	intentions: TRPCQueryOutput<"debtIntentions.getAll">;
} & React.ComponentProps<typeof Button>;

export const AcceptAllIntentionsButton: React.FC<Props> = ({
	intentions,
	...props
}) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const navigate = useNavigate();

	const acceptMutations = intentions.map((intention) =>
		// Intentions are stable due to `key` based on intention id in the upper component
		// eslint-disable-next-line react-hooks/rules-of-hooks
		useMutation(
			trpc.debtIntentions.accept.mutationOptions(
				// eslint-disable-next-line react-hooks/rules-of-hooks
				useTrpcMutationOptions(acceptDebtIntentionOptions, {
					context: { intention },
				}),
			),
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
		<Button color="primary" onPress={() => acceptAllIntentions()} {...props}>
			{t("intentions.acceptAllButton")}
		</Button>
	);
};
