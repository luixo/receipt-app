import React from "react";

import { useForm, useController, UseControllerProps } from "react-hook-form";

type Form = {
	value: string;
};

type Options = {
	initialValue?: string;
	rules?: UseControllerProps<Form, "value">["rules"];
};

export const useInput = ({ initialValue, rules }: Options) => {
	const { control, watch, setValue } = useForm<Form>({
		mode: "onChange",
		defaultValues: {
			value: initialValue,
		},
	});
	const { field, fieldState } = useController({
		name: "value",
		control,
		rules,
	});
	const setInputValue = React.useCallback(
		(nextValue: string) => setValue("value", nextValue),
		[setValue]
	);
	return {
		bindings: field,
		state: fieldState,
		value: watch("value"),
		setValue: setInputValue,
	};
};
