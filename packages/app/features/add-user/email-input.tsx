import React from "react";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "app/components/base/input";
import { useInputController } from "app/hooks/use-input-controller";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

export const EmailInput: React.FC<Props> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "email",
		form,
	});

	return (
		<Input
			{...bindings}
			label="Email"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};
