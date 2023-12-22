import React from "react";

import { Button, ButtonGroup } from "@nextui-org/react";
import { useRouter } from "solito/navigation";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debts.getIntentions">[number];
};

export const InboundDebtIntention = React.forwardRef<HTMLDivElement, Props>(
	({ intention }, ref) => {
		const router = useRouter();

		const acceptMutation = trpc.debts.acceptIntention.useMutation(
			useTrpcMutationOptions(mutations.debts.acceptIntention.options, {
				context: intention,
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
							router.push(`/debts/${intention.id}`);
						},
					},
				);
			},
			[acceptMutation, intention.id, router],
		);

		const { isPending } = acceptMutation;
		return (
			<DebtIntention intention={intention} ref={ref}>
				<ButtonGroup className="self-end" color="primary">
					<Button
						isDisabled={isPending}
						isLoading={isPending}
						onClick={() => acceptSyncIntention()}
						title={`Accept debt for ${intention.amount} ${intention.currencyCode}`}
					>
						Accept
					</Button>
					<Button
						variant="bordered"
						isDisabled={isPending}
						isLoading={isPending}
						onClick={() => acceptSyncIntention(true)}
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
	},
);
