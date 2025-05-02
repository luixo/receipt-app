import React from "react";

import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button, ButtonGroup } from "~components/button";
import { options as acceptDebtIntentionOptions } from "~mutations/debt-intentions/accept";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debtIntentions.getAll">[number];
};

export const InboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const navigate = useNavigate();

	const acceptMutation = trpc.debtIntentions.accept.useMutation(
		useTrpcMutationOptions(acceptDebtIntentionOptions, {
			context: { intention },
		}),
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
					title={`Accept debt for ${intention.amount} ${intention.currencyCode}`}
				>
					Accept
				</Button>
				<Button
					variant="bordered"
					isDisabled={isPending}
					isLoading={isPending}
					onPress={() => acceptSyncIntention(true)}
					title={`Accept and edit debt for ${intention.amount} ${intention.currencyCode}`}
				>
					Accept and edit
				</Button>
				<Button isDisabled variant="bordered">
					Reject
				</Button>
			</ButtonGroup>
		</DebtIntention>
	);
};
