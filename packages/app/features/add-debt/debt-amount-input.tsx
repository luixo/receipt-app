import React from "react";

import { Input } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

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
			value={bindings.value.toString()}
			required
			type="number"
			min="0"
			label="Amount"
			labelPlacement="outside"
			isDisabled={isLoading}
			isInvalid={Boolean(inputState.error)}
			errorMessage={inputState.error?.message}
		/>
	);
};
