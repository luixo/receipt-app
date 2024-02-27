import React from "react";

import type {
	FieldPath,
	FieldValues,
	PathValue,
	UseFormReturn,
} from "react-hook-form";
import { useController } from "react-hook-form";

import { formatIsoDate } from "~app/utils/date";

export type InputControllerOptions<
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>,
> = {
	form: UseFormReturn<Form>;
	name: FieldName;
	type?: React.HTMLInputTypeAttribute;
	defaultValue?: PathValue<Form, FieldName>;
};

export const useInputController = <
	Form extends FieldValues = FieldValues,
	FieldName extends FieldPath<Form> = FieldPath<Form>,
>({
	form,
	name,
	type,
	defaultValue,
}: InputControllerOptions<Form, FieldName>) => {
	const { field, fieldState } = useController({
		name,
		control: form.control,
		defaultValue,
	});
	const setValue = React.useCallback(
		(nextValue: PathValue<Form, FieldName>) => {
			if (type === "date") {
				form.setValue(
					name,
					formatIsoDate(nextValue as Date) as PathValue<Form, FieldName>,
					{ shouldValidate: true },
				);
			} else {
				form.setValue(name, nextValue, { shouldValidate: true });
			}
		},
		[form, name, type],
	);
	const onChange = React.useMemo<React.ChangeEventHandler<HTMLInputElement>>(
		() =>
			type === "number"
				? (e) => {
						const { value } = e.currentTarget;
						if (/^\d*[.,]?\d*$/.test(value)) {
							field.onChange(value as PathValue<Form, FieldName>);
						}
				  }
				: field.onChange,
		[field, type],
	);
	return {
		bindings: type === "number" ? { ...field, onChange } : field,
		state: fieldState,
		getValue: React.useCallback(() => form.watch(name), [form, name]),
		getNumberValue: React.useCallback(
			() => Number(form.watch(name)),
			[form, name],
		),
		setValue,
		form,
	};
};
