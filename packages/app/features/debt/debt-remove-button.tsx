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
	const deleteMutation = trpc.useMutation(
		"debts.delete",
		useTrpcMutationOptions(cache.debts.delete.mutationOptions, debt)
	);
	React.useEffect(
		() => setLoading(deleteMutation.isLoading),
		[deleteMutation.isLoading, setLoading]
	);
	const deleteDebt = useAsyncCallback(
		async (isMount) => {
			await deleteMutation.mutateAsync({ id: debt.id });
			if (!isMount()) {
				return;
			}
			router.replace(`/debts/user/${debt.userId}`);
		},
		[deleteMutation, debt.id, debt.userId, router]
	);

	return (
		<RemoveButton
			mutation={deleteMutation}
			onRemove={deleteDebt}
			subtitle="This will remove debt forever"
			noConfirm={debt.amount === 0}
			css={{ alignSelf: "flex-end" }}
		>
			Remove debt
		</RemoveButton>
	);
};
