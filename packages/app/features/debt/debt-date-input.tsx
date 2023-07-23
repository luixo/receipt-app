import React from "react";

import { DateInput } from "app/components/date-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtDateInput: React.FC<Props> = ({ debt, isLoading }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);

	const saveDate = React.useCallback(
		(nextDate: Date) => {
			// TODO: add date-fns comparison of dates
			if (nextDate.valueOf() === debt.timestamp.valueOf()) {
				return;
			}
			updateMutation.mutate({
				id: debt.id,
				update: { type: "timestamp", timestamp: nextDate },
			});
		},
		[updateMutation, debt.id, debt.timestamp],
	);

	return (
		<DateInput
			loading={updateMutation.isLoading}
			error={updateMutation.error}
			timestamp={debt.timestamp}
			disabled={isLoading || debt.locked}
			onUpdate={saveDate}
		/>
	);
};
