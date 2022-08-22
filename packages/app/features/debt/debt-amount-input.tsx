import React from "react";

import { Input, styled } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { debtAmountSchema } from "app/utils/validation";

import { DebtCurrencyInput } from "./debt-currency-input";

const Content = styled("div", {
	display: "flex",
	alignItems: "center",
});

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtAmountInput: React.FC<Props> = ({ debt, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getNumberValue,
	} = useSingleInput({
		initialValue: Math.abs(debt.amount),
		schema: debtAmountSchema,
		type: "number",
	});

	const updateMutation = trpc.useMutation(
		"debts.update",
		useTrpcMutationOptions(cache.debts.update.mutationOptions, debt)
	);
	const updateAmount = React.useCallback(
		async (amount: number) => {
			if (amount !== Math.abs(debt.amount)) {
				const currentSign = debt.amount >= 0 ? 1 : -1;
				updateMutation.mutate({
					id: debt.id,
					update: { type: "amount", amount: amount * currentSign },
				});
			}
		},
		[updateMutation, debt.id, debt.amount]
	);

	return (
		<Input
			{...bindings}
			aria-label="Debt amount"
			disabled={updateMutation.isLoading || isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={inputState.error?.message || updateMutation.error?.message}
			contentRightStyling={false}
			contentRight={
				<Content>
					<DebtCurrencyInput debt={debt} isLoading={isLoading} />
					<IconButton
						title="Save debt amount"
						light
						isLoading={updateMutation.isLoading}
						disabled={isLoading || Boolean(inputState.error)}
						onClick={() => updateAmount(getNumberValue())}
						icon={<CheckMark color="currentColor" size={24} />}
						color={getNumberValue() === debt.amount ? undefined : "warning"}
					/>
				</Content>
			}
			css={{ maxWidth: "$96" }}
			bordered
		/>
	);
};
