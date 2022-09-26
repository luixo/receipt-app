import React from "react";

import { Spacer, Button } from "@nextui-org/react";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { DebtIntention } from "./debt-intention";

type Props = {
	intention: TRPCQueryOutput<"debtsSyncIntentions.getAll">["outbound"][number];
};

export const OutboundDebtIntention: React.FC<Props> = ({ intention }) => {
	const removeMutation = trpc.debtsSyncIntentions.remove.useMutation(
		useTrpcMutationOptions(mutations.debtsSyncIntentions.remove.options, {
			context: intention,
		})
	);
	const cancelSyncIntention = React.useCallback(
		() => removeMutation.mutate({ id: intention.id }),
		[removeMutation, intention.id]
	);

	return (
		<DebtIntention intention={intention}>
			<Spacer y={0.5} />
			<Button
				css={{ alignSelf: "flex-end" }}
				auto
				disabled={removeMutation.isLoading}
				onClick={cancelSyncIntention}
				color="warning"
			>
				Cancel
			</Button>
		</DebtIntention>
	);
};
