import React from "react";

import { Button, Spacer } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/error-message";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debts-sync-intentions.get-all">["inbound"][number];
};

export const InboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const router = useRouter();

	const acceptMutation = trpc.useMutation(
		"debts-sync-intentions.accept",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.accept.mutationOptions,
			React.useMemo(
				() => ({
					userId: intention.userId,
					currency: intention.currency,
					currentAmount: intention.current?.amount,
				}),
				[intention]
			)
		)
	);
	const acceptSyncIntention = useAsyncCallback(
		async (isMount, redirectToDebt = false) => {
			await acceptMutation.mutateAsync({ id: intention.id });
			if (!isMount() || !redirectToDebt) {
				return;
			}
			router.push(`/debts/${intention.id}`);
		},
		[acceptMutation, intention.id, router]
	);

	const rejectMutation = trpc.useMutation(
		"debts-sync-intentions.reject",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.reject.mutationOptions,
			React.useMemo(
				() => ({
					userId: intention.userId,
					currentAmount: intention.current?.amount,
				}),
				[intention]
			)
		)
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
