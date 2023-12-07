import React from "react";

import { Input } from "@nextui-org/react-tailwind";
import type { UseFormReturn } from "react-hook-form";

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
			labelPlacement="outside"
			isDisabled={isLoading}
			isInvalid={Boolean(inputState.error)}
			errorMessage={inputState.error?.message}
			autoFocus
		/>
	);
};
