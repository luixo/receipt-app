import React from "react";

import {
	useController,
	FieldValues,
	FieldPath,
	UnpackNestedValue,
	FieldPathValue,
	UseFormReturn,
} from "react-hook-form";

export type InputControllerOptions<
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
> = {
	form: UseFormReturn<Form>;
	name: FieldName;
};

export const useInputController = <
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
>({
	form,
	name,
}: InputControllerOptions<Form, FieldName>) => {
	const { field, fieldState } = useController({
		name,
		control: form.control,
	});
	const setValue = React.useCallback(
		(nextValue: UnpackNestedValue<FieldPathValue<Form, FieldName>>) =>
			form.setValue(name, nextValue),
		[form, name]
	);
	return {
		bindings: field,
		state: fieldState,
		getValue: React.useCallback(() => form.watch(name), [form, name]),
		setValue,
		form,
	};
};
