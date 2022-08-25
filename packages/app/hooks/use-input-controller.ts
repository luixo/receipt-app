import React from "react";

import { FormElement } from "@nextui-org/react";
import {
	useController,
	FieldValues,
	FieldPath,
	FieldPathValue,
	UseFormReturn,
} from "react-hook-form";

import { formatIsoDate } from "app/utils/date";

export type InputControllerOptions<
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
> = {
	form: UseFormReturn<Form>;
	name: FieldName;
	type?: React.HTMLInputTypeAttribute;
};

export const useInputController = <
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>
>({
	form,
	name,
	type,
}: InputControllerOptions<Form, FieldName>) => {
	const { field, fieldState } = useController({
		name,
		control: form.control,
	});
	const setValue = React.useCallback(
		(nextValue: FieldPathValue<Form, FieldName>) => {
			if (type === "date") {
				form.setValue(
					name,
					formatIsoDate(nextValue as Date) as FieldPathValue<Form, FieldName>
				);
			} else {
				form.setValue(name, nextValue);
			}
		},
		[form, name, type]
	);
	const onChange = React.useMemo<React.ChangeEventHandler<FormElement>>(
		() =>
			type === "number"
				? (e) => {
						const { value } = e.currentTarget;
						if (/^\d*[.,]?\d*$/.test(value)) {
							field.onChange(value);
						}
				  }
				: field.onChange,
		[field, type]
	);
	return {
		bindings: type === "number" ? { ...field, onChange } : field,
		state: fieldState,
		getValue: React.useCallback(() => form.watch(name), [form, name]),
		getNumberValue: React.useCallback(
			() => Number(form.watch(name)),
			[form, name]
		),
		setValue,
		form,
	};
};
