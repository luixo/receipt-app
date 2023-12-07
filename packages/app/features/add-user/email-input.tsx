import React from "react";

import { Input } from "@nextui-org/react";
import type { UseFormReturn } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";
import type { TRPCMutationResult } from "app/trpc";

import type { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"users.add">;
};

export const EmailInput: React.FC<Props> = ({ form, query }) => {
	const { bindings, state: inputState } = useInputController({
		name: "email",
		form,
	});

	return (
		<Input
			{...bindings}
			label="Email"
			labelPlacement="outside"
			isDisabled={query.isLoading}
			isInvalid={Boolean(inputState.error)}
			errorMessage={inputState.error?.message}
		/>
	);
};
