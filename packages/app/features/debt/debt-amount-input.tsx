import React from "react";

import { Input, styled } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
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
	const isAmountSync = absoluteAmount === getNumberValue();

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
					<Button
						title="Save debt amount"
						variant="light"
						isLoading={updateMutation.isLoading}
						isDisabled={isLoading || Boolean(inputState.error) || isAmountSync}
						onClick={() => updateAmount(getNumberValue())}
						isIconOnly
						color={isAmountSync ? "success" : "warning"}
					>
						<CheckMark color="currentColor" size={24} />
					</Button>
				</Content>
			}
			css={{ maxWidth: "$96" }}
			bordered
		/>
	);
};
