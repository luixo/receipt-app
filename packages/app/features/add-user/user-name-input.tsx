import React from "react";

import { Input } from "@nextui-org/react";
import { UseFormReturn } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";
import { TRPCMutationResult } from "app/trpc";

import { Form } from "./types";

type Props = {
	form: UseFormReturn<Form>;
	query: TRPCMutationResult<"users.put">;
};

export const UserNameInput: React.FC<Props> = ({ form, query }) => {
	const { bindings, state: inputState } = useInputController({
		name: "name",
		form,
	});

	return (
		<Input
			{...bindings}
			required
			label="User name"
			disabled={query.isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor="warning"
			helperText={inputState.error?.message}
		/>
	);
};
