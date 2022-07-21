import React from "react";

import {
	useController,
	Control,
	FieldValues,
	FieldPath,
	UseFormSetValue,
	UnpackNestedValue,
	FieldPathValue,
	UseFormWatch,
} from "react-hook-form";

export type InputControllerOptions<
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
> = {
	control: Control<Form>;
	name: FieldName;
	setValue: UseFormSetValue<Form>;
	watch: UseFormWatch<Form>;
};

export const useInputController = <
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
>({
	control,
	name,
	setValue: setFormValue,
	watch,
}: InputControllerOptions<Form, FieldName>) => {
	const { field, fieldState } = useController({
		name,
		control,
	});
	const setValue = React.useCallback(
		(nextValue: UnpackNestedValue<FieldPathValue<Form, FieldName>>) =>
			setFormValue(name, nextValue),
		[setFormValue, name]
	);
	return {
		bindings: field,
		state: fieldState,
		getValue: React.useCallback(() => watch(name), [watch, name]),
		setValue,
	};
};
