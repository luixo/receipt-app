import React from "react";

import { Button, Spacer } from "@nextui-org/react";

import { MutationErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debtsSyncIntentions.getAll">["inbound"][number];
};

export const InboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const router = useRouter();

	const acceptMutation = trpc.debtsSyncIntentions.accept.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.accept.options, {
			context: React.useMemo(
				() => ({
					debtId: intention.id,
					userId: intention.userId,
					currency: intention.currency,
					currentAmount: intention.current?.amount,
				}),
				[intention]
			),
		})
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
				}
			);
		},
		[acceptMutation, intention.id, router]
	);

	const rejectMutation = trpc.debtsSyncIntentions.reject.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.reject.options, {
			context: React.useMemo(
				() => ({
					userId: intention.userId,
					currentAmount: intention.current?.amount,
					receiptId: intention.receiptId,
				}),
				[intention]
			),
		})
	);
	const rejectSyncIntention = React.useCallback(
		() => rejectMutation.mutate({ id: intention.id }),
		[rejectMutation, intention.id]
	);

	const isLoading = acceptMutation.isLoading || rejectMutation.isLoading;
	return (
		<DebtIntention intention={intention}>
			<Spacer y={0.5} />
			<Button.Group css={{ alignSelf: "flex-end" }}>
				<Button
					disabled={isLoading}
					onClick={() => acceptSyncIntention()}
					title={`Accept debt for ${intention.amount} ${intention.currency}`}
				>
					Accept
				</Button>
				<Button
					bordered
					disabled={isLoading}
					onClick={() => acceptSyncIntention(true)}
					title={`Accept and edit debt for ${intention.amount} ${intention.currency}`}
				>
					Accept and edit
				</Button>
				<Button disabled={isLoading} onClick={rejectSyncIntention} bordered>
					Reject
				</Button>
			</Button.Group>
			{acceptMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={acceptMutation} />
				</>
			) : null}
			{rejectMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={rejectMutation} />
				</>
			) : null}
		</DebtIntention>
	);
};
