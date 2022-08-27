import React from "react";

import { Spacer, Button } from "@nextui-org/react";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/error-message";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debts-sync-intentions.get-all">["outbound"][number];
};

export const OutboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const deleteMutation = trpc.useMutation(
		"debts-sync-intentions.delete",
		useTrpcMutationOptions(
			cache.debtsSyncIntentions.delete.mutationOptions,
			intention
		)
	);
	const cancelSyncIntention = React.useCallback(
		() => deleteMutation.mutate({ id: intention.id }),
		[deleteMutation, intention.id]
	);

	return (
		<DebtIntention intention={intention}>
			<Spacer y={0.5} />
			<Button
				css={{ alignSelf: "flex-end" }}
				auto
				disabled={deleteMutation.isLoading}
				onClick={cancelSyncIntention}
				color="warning"
			>
				Cancel
			</Button>
			{deleteMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={deleteMutation} />
				</>
			) : null}
		</DebtIntention>
	);
};
