import React from "react";

import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	setLoading: (nextLoading: boolean) => void;
};

export const DebtRemoveButton: React.FC<Props> = ({ debt, setLoading }) => {
	const router = useRouter();
	const removeMutation = trpc.debts.remove.useMutation(
		useTrpcMutationOptions(cache.debts.remove.mutationOptions, debt)
	);
	React.useEffect(
		() => setLoading(removeMutation.isLoading),
		[removeMutation.isLoading, setLoading]
	);
	const removeDebt = useAsyncCallback(
		async (isMount) => {
			await removeMutation.mutateAsync({ id: debt.id });
			if (!isMount()) {
				return;
			}
			router.replace(`/debts/user/${debt.userId}`);
		},
		[removeMutation, debt.id, debt.userId, router]
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
