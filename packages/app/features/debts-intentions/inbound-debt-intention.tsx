import React from "react";

import { Button, Spacer } from "@nextui-org/react";

import { useRouter } from "app/hooks/use-router";
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
							void router.push(`/debts/${intention.id}`);
						},
					},
				);
			},
			[acceptMutation, intention.id, router],
		);

		const { isLoading } = acceptMutation;
		return (
			<DebtIntention intention={intention} ref={ref}>
				<Spacer y={0.5} />
				<Button.Group css={{ alignSelf: "flex-end" }}>
					<Button
						disabled={isLoading}
						onClick={() => acceptSyncIntention()}
						title={`Accept debt for ${intention.amount} ${intention.currencyCode}`}
					>
						Accept
					</Button>
					<Button
						bordered
						disabled={isLoading}
						onClick={() => acceptSyncIntention(true)}
						title={`Accept and edit debt for ${intention.amount} ${intention.currencyCode}`}
					>
						Accept and edit
					</Button>
					<Button disabled bordered>
						Reject
					</Button>
				</Button.Group>
			</DebtIntention>
		);
	},
);
