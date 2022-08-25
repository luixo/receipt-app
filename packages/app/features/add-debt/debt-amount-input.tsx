import React from "react";

import { Input } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";

import { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const DebtAmountInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "amount",
		type: "number",
	});

	return (
		<Input
			{...bindings}
			fullWidth
			required
			type="number"
			min="0"
			label="Amount"
			disabled={isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor="warning"
			helperText={inputState.error?.message}
		/>
	);
};
