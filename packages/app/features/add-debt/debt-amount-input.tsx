import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "app/components/base/input";
import { useInputController } from "app/hooks/use-input-controller";

import type { Form } from "./types";

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
			required
			type="number"
			min="0"
			label="Amount"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};
