import React from "react";

import { Input } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const DebtNoteInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "note",
		form,
	});

	return (
		<Input
			{...bindings}
			required
			label="Debt note"
			labelPlacement="outside"
			isDisabled={isLoading}
			isInvalid={Boolean(inputState.error)}
			errorMessage={inputState.error?.message}
		/>
	);
};
