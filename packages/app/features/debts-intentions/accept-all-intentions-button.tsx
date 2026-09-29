import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { NavigationContext } from "#app/contexts/navigation-context.ts";
import { useTrpcMutationOptions } from "#app/hooks/use-trpc-mutation-options.ts";
import type { DebtIntention } from "#app/trpc-types.ts";
import { useTRPC } from "#app/utils/trpc.ts";
import { Button } from "#components/button.tsx";
import { options as acceptDebtIntentionOptions } from "#mutations/debt-intentions/accept.ts";

type Props = {
	intentions: DebtIntention[];
} & React.ComponentProps<typeof Button>;

export const AcceptAllIntentionsButton: React.FC<Props> = ({
	intentions,
	...props
}) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const acceptMutations = intentions.map((intention) =>
		// Intentions are stable due to `key` based on intention id in the upper component
		// oxlint-disable-next-line react-hooks/rules-of-hooks
		useMutation(
			trpc.debtIntentions.accept.mutationOptions(
				// oxlint-disable-next-line react-hooks/rules-of-hooks
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
					// oxlint-disable-next-line typescript/no-non-null-assertion
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
			onPress={() => void acceptAllIntentions()}
			{...props}
		>
			{t("intentions.acceptAllButton")}
		</Button>
	);
};
