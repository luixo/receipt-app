import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useLocale } from "~app/hooks/use-locale";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Button, ButtonGroup } from "~components/button";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debtIntentions.getAll">[number];
};

export const InboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const { t } = useTranslation("debts");
	const locale = useLocale();
	const trpc = useTRPC();
	const navigate = useNavigate();

	const acceptMutation = useMutation(
		trpc.debtIntentions.accept.mutationOptions(
			useTrpcMutationOptions(acceptDebtIntentionOptions, {
				context: { intention },
			}),
		),
	);
	const acceptSyncIntention = React.useCallback(
		(redirectToDebt = false) => {
			acceptMutation.mutate(
				{ id: intention.id },
				{
					onSuccess: () => {
						if (!redirectToDebt) {
							return;
						}
						navigate({ to: "/debts/$id", params: { id: intention.id } });
					},
				},
			);
		},
		[acceptMutation, intention.id, navigate],
	);

	const { isPending } = acceptMutation;
	return (
		<DebtIntention intention={intention}>
			<ButtonGroup className="self-end" color="primary">
				<Button
					isDisabled={isPending}
					isLoading={isPending}
					onPress={() => acceptSyncIntention()}
					title={t("intentions.buttons.acceptLong", {
						amount: formatCurrency(
							locale,
							intention.currencyCode,
							intention.amount,
						),
					})}
				>
					{t("intentions.buttons.accept")}
				</Button>
				<Button
					variant="bordered"
					isDisabled={isPending}
					isLoading={isPending}
					onPress={() => acceptSyncIntention(true)}
					title={t("intentions.buttons.acceptAndEditLong", {
						amount: formatCurrency(
							locale,
							intention.currencyCode,
							intention.amount,
						),
					})}
				>
					{t("intentions.buttons.acceptAndEdit")}
				</Button>
				<Button isDisabled variant="bordered">
					{t("intentions.buttons.reject")}
				</Button>
			</ButtonGroup>
		</DebtIntention>
	);
};
