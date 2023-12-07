import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "app/components/base/input";
import { useInputController } from "app/hooks/use-input-controller";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "name",
	});

	return (
		<Input
			{...bindings}
			required
			label="Item name"
			isDisabled={isLoading}
			fieldError={inputState.error}
			autoFocus
		/>
	);
};
