import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "app/components/base/input";
import { useInputController } from "app/hooks/use-input-controller";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "price",
		type: "number",
	});

	return (
		<Input
			{...bindings}
			required
			type="number"
			min="0"
			label="Price per unit"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};
