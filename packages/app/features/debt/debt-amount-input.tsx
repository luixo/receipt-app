import React from "react";

import { Input } from "app/components/base/input";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { debtAmountSchema } from "app/utils/validation";

import { DebtCurrencyInput } from "./debt-currency-input";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtAmountInput: React.FC<Props> = ({ debt, isLoading }) => {
	const absoluteAmount = Math.abs(debt.amount);
	const {
		bindings,
		state: inputState,
		getNumberValue,
		setValue,
	} = useSingleInput({
		initialValue: absoluteAmount,
		schema: debtAmountSchema,
		type: "number",
	});
	React.useEffect(
		() => setValue(Math.abs(debt.amount)),
		[debt.amount, setValue],
	);

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const updateAmount = React.useCallback(
		async (amount: number) => {
			if (amount !== absoluteAmount) {
				const currentSign = debt.amount >= 0 ? 1 : -1;
				updateMutation.mutate({
					id: debt.id,
					update: { amount: amount * currentSign },
				});
			}
		},
		[updateMutation, debt.id, debt.amount, absoluteAmount],
	);

	return (
		<Input
			{...bindings}
			value={bindings.value.toString()}
			aria-label="Debt amount"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save debt amount",
				isHidden: absoluteAmount === getNumberValue(),
				onClick: () => updateAmount(getNumberValue()),
			}}
			endContent={<DebtCurrencyInput debt={debt} isLoading={isLoading} />}
			variant="bordered"
		/>
	);
};
