import React from "react";

import { Input } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";
import { parseNumberWithDecimals } from "app/utils/validation";

import { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "price",
	});

	const onChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const parsedNumber = parseNumberWithDecimals(e.currentTarget.value);
			if (parsedNumber === undefined) {
				return;
			}
			bindings.onChange(parsedNumber);
		},
		[bindings]
	);

	return (
		<Input
			{...bindings}
			onChange={onChange}
			fullWidth
			required
			type="number"
			min="0"
			label="Price per unit"
			disabled={isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor="warning"
			helperText={inputState.error?.message}
		/>
	);
};
