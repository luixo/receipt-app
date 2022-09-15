import React from "react";

import { SignButtonGroup } from "app/components/app/sign-button-group";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	disabled: boolean;
};

export const DebtSignButtonGroup: React.FC<Props> = ({ debt, disabled }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, debt)
	);
	const setDirection = React.useCallback(
		(direction: "+" | "-") => {
			if (
				(direction === "+" && debt.amount >= 0) ||
				(direction === "-" && debt.amount < 0)
			) {
				return;
			}
			return updateMutation.mutate({
				id: debt.id,
				update: { type: "amount", amount: debt.amount * -1 },
			});
		},
		[updateMutation, debt.id, debt.amount]
	);
	return (
		<SignButtonGroup
			disabled={disabled || debt.locked}
			isLoading={updateMutation.isLoading}
			onUpdate={setDirection}
			direction={debt.amount >= 0 ? "+" : "-"}
		/>
	);
};
