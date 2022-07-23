import React from "react";

import { Input } from "@nextui-org/react";
import { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

import { useInputController } from "app/hooks/use-input-controller";
import { TRPCMutationResult } from "app/trpc";

import { Form } from "./types";

type Props = {
	control: Control<Form>;
	setValue: UseFormSetValue<Form>;
	watch: UseFormWatch<Form>;
	query: TRPCMutationResult<"users.put">;
};

export const UserNameInput: React.FC<Props> = ({
	control,
	setValue,
	watch,
	query,
}) => {
	const { bindings, state: inputState } = useInputController({
		control,
		name: "name",
		setValue,
		watch,
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
