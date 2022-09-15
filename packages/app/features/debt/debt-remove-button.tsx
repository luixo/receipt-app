import React from "react";

import { useRouter } from "solito/router";

import { RemoveButton } from "app/components/remove-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	setLoading: (nextLoading: boolean) => void;
};

export const DebtRemoveButton: React.FC<Props> = ({ debt, setLoading }) => {
	const router = useRouter();
	const removeMutation = trpc.debts.remove.useMutation(
		useTrpcMutationOptions(mutations.debts.remove.options, {
			context: debt,
			onSuccess: () => router.replace(`/debts/user/${debt.userId}`),
		})
	);
	React.useEffect(
		() => setLoading(removeMutation.isLoading),
		[removeMutation.isLoading, setLoading]
	);
	const removeDebt = React.useCallback(
		() => removeMutation.mutate({ id: debt.id }),
		[removeMutation, debt.id]
	);

	return (
		<RemoveButton
			mutation={removeMutation}
			onRemove={removeDebt}
			subtitle="This will remove debt forever"
			noConfirm={debt.amount === 0}
			css={{ alignSelf: "flex-end" }}
		>
			Remove debt
		</RemoveButton>
	);
};
